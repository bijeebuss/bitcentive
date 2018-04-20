import * as Web3 from 'web3';

import * as BigNumber from 'bignumber.js';
import * as ethUtil from 'ethereumjs-util';
import { promisify } from 'util';

import { ECSignature } from 'ethereumjs-util';
import { promiseIfy } from './utils';

export function getAccounts(
  web3: Web3,
): Promise<string[]> {
  return promisify((cb) => web3.eth.getAccounts(cb)) as any;
}


export async function getDefaultAccount(
  web3: Web3,
): Promise<string> {
  const accounts = await getAccounts(web3);
  return accounts[0];
}

export async function personalSign(web3: Web3, msg: string, account?: string): Promise<string> {
  let from: string;
  if (typeof account === 'undefined') {
    from = await getDefaultAccount(web3);
  } else {
    from = account;
  }

  return new Promise<string>((resolve, reject) => {
    let hexMsg = toHex(msg);
    // current web3js version does not support personal.sign yet
    web3.currentProvider.sendAsync({method: 'personal_sign', params: [hexMsg, from], from}, (err, result) => {
      if (err) { return reject(err); }
      if (result.error) {
        // TODO: make sure personal_sign and eth_sign produce the same result here
        if (
          result.error.message &&
          result.error.message.indexOf('Method personal_sign not supported.') !== -1) {
          // provider doesnt support personal_sign
          hexMsg = prefixPersonalMessage(msg);
          return web3.eth.sign(from, hexMsg, (ethSignErr, ethSignResult) => {
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

export function toHex(msg: string): string {
  return ethUtil.bufferToHex(ethUtil.toBuffer(msg, 'utf8'));
}

export function prefixPersonalMessage(msg: string): string {
  const msgBuf = ethUtil.toBuffer(msg, 'utf8');
  const prefix = ethUtil.toBuffer('\u0019Ethereum Signed Message:\n' + msgBuf.length.toString(), 'utf8');
  const fullMsg = Buffer.concat([prefix, msgBuf]);
  return ethUtil.bufferToHex(fullMsg);
}


// Stolen from 0x
export async function signHash(
  hash: string,
  signerAddress: string,
  shouldAddPersonalMessagePrefix: boolean,
  ): Promise<ECSignature> {

  const normalizedSignerAddress = signerAddress.toLowerCase();

  let msgHashHex = hash;
  if (shouldAddPersonalMessagePrefix) {
      const orderHashBuff = ethUtil.toBuffer(hash);
      const msgHashBuff = ethUtil.hashPersonalMessage(orderHashBuff);
      msgHashHex = ethUtil.bufferToHex(msgHashBuff);
  }

  const signature = await promiseIfy<string>(web3.eth.sign, normalizedSignerAddress, msgHashHex);

  // HACK: There is no consensus on whether the signatureHex string should be formatted as
  // v + r + s OR r + s + v, and different clients (even different versions of the same client)
  // return the signature params in different orders. In order to support all client implementations,
  // we parse the signature in both ways, and evaluate if either one is a valid signature.
  const ecSignatureVRS = parseSignatureHexAsVRS(signature);
  if (ecSignatureVRS.v === 27 || ecSignatureVRS.v === 28) {
      const isValidVRSSignature = isValidSignature(hash, ecSignatureVRS, normalizedSignerAddress);
      if (isValidVRSSignature) {
          return ecSignatureVRS;
      }
  }

  const ecSignatureRSV = parseSignatureHexAsRSV(signature);
  if (ecSignatureRSV.v === 27 || ecSignatureRSV.v === 28) {
      const isValidRSVSignature = isValidSignature(hash, ecSignatureRSV, normalizedSignerAddress);
      if (isValidRSVSignature) {
          return ecSignatureRSV;
      }
  }

  throw new Error('Not a valid signature');
}

export function isValidSignature(data: string, signature: ECSignature, signerAddress: string): boolean {
  const dataBuff = ethUtil.toBuffer(data);
  const msgHashBuff = ethUtil.hashPersonalMessage(dataBuff);
  try {
      const pubKey = ethUtil.ecrecover(
          msgHashBuff,
          signature.v,
          ethUtil.toBuffer(signature.r),
          ethUtil.toBuffer(signature.s),
      );
      const retrievedAddress = ethUtil.bufferToHex(ethUtil.pubToAddress(pubKey));
      return retrievedAddress === signerAddress;
  } catch (err) {
      return false;
  }
}

export function parseSignatureHexAsVRS(signatureHex: string): ECSignature {
  const signatureBuffer = ethUtil.toBuffer(signatureHex);
  let v = signatureBuffer[0];
  if (v < 27) {
      v += 27;
  }
  const r = signatureBuffer.slice(1, 33);
  const s = signatureBuffer.slice(33, 65);
  const ecSignature: ECSignature = {
      v,
      r: ethUtil.bufferToHex(r),
      s: ethUtil.bufferToHex(s),
  };
  return ecSignature;
}

export function parseSignatureHexAsRSV(signatureHex: string): ECSignature {
  const { v, r, s } = ethUtil.fromRpcSig(signatureHex);
  const ecSignature: ECSignature = {
      v,
      r: ethUtil.bufferToHex(r as any),
      s: ethUtil.bufferToHex(s as any),
  };
  return ecSignature;
}
