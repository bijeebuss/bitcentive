import * as Web3 from 'web3';
import * as ethUtil from 'ethereumjs-util';
import * as contract from 'truffle-contract'
import {default as BigNumber} from 'bignumber.js';

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
  //Oracle: any;

  constructor() {
    //this.Oracle = contract(oracle_artifacts);
    this.checkAndRefreshWeb3().catch(this.handleCommonError);
    setInterval(() => this.checkAndRefreshWeb3().catch(this.handleCommonError), 500);
  }

  //getOracle = () => this.Oracle.deployed()

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
          return this.refreshAccounts((err, result) => {
            if(err) return reject(err);
            else return resolve(result);
          });
        }
        if(!_window().web3) return reject(new Web3Error("Missing injected web3"));

        this.web3 = new Web3(_window().web3.currentProvider);
        return this.refreshAccounts((err, result) => {
          if(err)
            return reject(err);
          else
            return resolve(result);
        });
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
        // this.Oracle.setProvider(this.web3.currentProvider);
        // this.Oracle.defaults({from: accs[0], gasPrice: 20000000000, gas: 300000});
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

  personalSign(text: string) {
    var msg = ethUtil.bufferToHex(ethUtil.toBuffer(text))
    var from = this.accounts[0]
    return new Promise((resolve,reject) => {
      this.web3.personal.sign(msg, from, (err,sig) => {
        if(err) return reject(err);
        return resolve(sig);
      });
    })
  }

  toEth = (bigNumber: BigNumber, decimals: number) => {
    return bigNumber.times(new BigNumber(10).pow(-decimals));
  }

  toWei = (eth: number, decimals: number) => {
    return new BigNumber(eth).times(new BigNumber(10).pow(decimals));
  }

  // getOracleContractWeb3 = () => {
  //   var contract = this.web3.eth.contract(oracle_artifacts.abi);
  //   return new Promise((resolve) => {
  //     return this.getOracle()
  //     .then((o: any) => {
  //       resolve(contract.at(o.address));
  //     })
  //   })

  // }

}

class Web3Error {
  error: Error;
  constructor(err: any){
    this.error = new Error(err);
  }
}

export default new Web3Service();
