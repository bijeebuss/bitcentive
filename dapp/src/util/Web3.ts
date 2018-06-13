import * as Web3 from 'web3';
import * as ethUtil from 'ethereumjs-util';
import * as contract from 'truffle-contract'
import {default as BigNumber} from 'bignumber.js';
import * as artifacts from '../../../truffle/build/contracts/BitCentive.json';

interface WindowWithWeb3 extends Window {
  web3?: Web3;
}

function _window() {
  // return the global native browser window object
  return window as WindowWithWeb3;
}

class Web3Service {

  web3: Web3;
  accounts: string[];
  BitCentive: any;

  constructor() {
    this.BitCentive = contract(artifacts);
    this.checkAndRefreshWeb3().catch(this.handleCommonError);
    setInterval(() => this.checkAndRefreshWeb3().catch(this.handleCommonError), 1000);
  }

  getBitCentive = () => this.BitCentive.deployed()

  isLoggedIn() {
    return !!this.accounts;
  }

  providerHasChanged = () => {
    return _window().web3.currentProvider !== this.web3.currentProvider
  }

  checkAndRefreshWeb3() {
    return new Promise((resolve,reject) => {
      try {
        if (!_window()) return reject("Can't get window reference");

        if(this.isLoggedIn() && !this.providerHasChanged()) {
          return this.refreshAccounts((err, result) => err ? reject(err) : resolve(result));
        }

        if(!_window().web3) return reject(new Web3Error("Missing injected web3"));

        this.web3 = new Web3(_window().web3.currentProvider);
        return this.refreshAccounts((err, result) => err ? reject(err) : resolve(result));
      }
      catch(err) {
        return reject(err);
      }
    })
  };

  refreshAccounts(callback: (err: any, result?: string) => void) {
    this.web3.eth.getAccounts((err, accs) => {
      if (err != null) {
        return callback(new Web3Error("There was an error fetching your accounts."));
      }
      if (accs.length === 0) {
        return callback(new Web3Error("Couldn't get any accounts! Make sure your Ethereum client is configured correctly."));
      }
      if (!this.accounts || this.accounts.length !== accs.length || this.accounts[0] !== accs[0]) {
        this.accounts = accs;
        this.web3.eth.defaultAccount = accs[0];

        // Bootstrap the contract abstractions for Use.
        this.BitCentive.setProvider(this.web3.currentProvider);
        this.BitCentive.defaults({from: accs[0], gasPrice: 20000000000, gas: 300000});

        return callback(null, "Observed new accounts");
      }
      return callback(null, "Accounts up to date");
    });
  }

  handleCommonError(err: any) {
    if(err instanceof Web3Error){
      //return console.log(err);
    }
    else {
      throw err;
    }
  }

  async personalSign(msg: string, account?: string): Promise<string> {
    let from: string;
    if (typeof account === 'undefined') {
      from = this.accounts[0]
    } else {
      from = account;
    }

    return new Promise<string>((resolve, reject) => {
      let hexMsg = ethUtil.bufferToHex(ethUtil.toBuffer(msg));
      // current web3js version does not support personal.sign yet
      this.web3.currentProvider.sendAsync({method: 'personal_sign', params: [hexMsg, from]} as any, (err, result: any) => {
        if (err) { return reject(err); }
        if (result.error) {
          // TODO: make sure personal_sign and eth_sign produce the same result here
          if (
            result.error.message &&
            result.error.message.indexOf('Method personal_sign not supported.') !== -1) {
            // provider doesnt support personal_sign
            hexMsg = this.prefixPersonalMessage(msg);
            return this.web3.eth.sign(from, hexMsg, (ethSignErr, ethSignResult) => {
              if (ethSignErr) {return reject(ethSignErr); }
              return resolve(ethSignResult);
            });
          } else {
            return reject(result.error);
          }
        }
        return resolve(result.result);
      });
    });
  }

  private prefixPersonalMessage(msg: string): string {
    const msgBuf = ethUtil.toBuffer(msg);
    const prefix = ethUtil.toBuffer('\u0019Ethereum Signed Message:\n' + msgBuf.length.toString());
    const fullMsg = Buffer.concat([prefix, msgBuf]);
    return ethUtil.bufferToHex(fullMsg);
  }

  toEth = (bigNumber: BigNumber, decimals: number) => {
    return bigNumber.times(new BigNumber(10).pow(-decimals));
  }

  toWei = (eth: number, decimals: number) => {
    return new BigNumber(eth).times(new BigNumber(10).pow(decimals));
  }

  getBitCentiveContractWeb3 = () => {
    var contract = this.web3.eth.contract(artifacts.abi);
    return new Promise((resolve) => {
      return this.getBitCentive()
      .then((o: any) => {
        resolve(contract.at(o.address));
      })
    })
  }

}

class Web3Error {
  error: Error;
  constructor(err: any){
    this.error = new Error(err);
  }
}

export default new Web3Service();
