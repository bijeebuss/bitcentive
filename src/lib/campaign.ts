import * as ethABI from 'ethereumjs-abi';
import * as ethUtil from 'ethereumjs-util';

export function hashCheckin(
  contract: string,
  user: string,
  nonce: number,
  timestamp: number,
  billable: boolean,
): string {
  // bytes32 checkinHash = keccak256(this, msg.sender, nonce, timestamp, billable);
  const hashBuff = ethABI.soliditySHA3(
    // tslint:disable-next-line:whitespace
    ['address'  ,'address'  ,'uint16'  ,'uint'     ,'bool'],
    // tslint:disable-next-line:whitespace
    [contract   ,user       ,nonce     ,timestamp  ,billable],
  );
  return ethUtil.bufferToHex(hashBuff);
}
