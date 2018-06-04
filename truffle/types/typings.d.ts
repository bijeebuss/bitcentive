
declare module 'ethereumjs-util' {
  namespace Util {

    export interface ECSignature {
      v: number;
      r: string;
      s: string;
    }

    function fromRpcSig(sig: string): ECSignature;
    function bufferToHex(buffer: Buffer): string;
    function toBuffer(data: string | string | number, encoding?: string): Buffer;
    function hashPersonalMessage(hash: Buffer) : Buffer;
    function ecrecover(msgHashBuff: Buffer, v: Buffer | Number, r: Buffer | Number, s: Buffer | Number) : Buffer;
    function pubToAddress(pubKey: Buffer) : Buffer;
  }

  export = Util;
}

declare module 'ethereumjs-abi';
