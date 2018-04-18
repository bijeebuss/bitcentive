pragma solidity 0.4.21;


library Bytes32Lib {
  using Bytes32Lib for bytes32;

  function getByte(bytes32 data, uint256 position) internal returns(bytes32) {
    bytes32 mask = bytes32(0xFF) << ((32 - 1 - position) * 8);
    return (data & mask) >> ((32 - 1 - position) * 8);
  }

  function setByte(bytes32 data, uint256 position, uint256 newData) internal returns(bytes32 result) {
    assembly {
      mstore(0x0, data)
      mstore8(position, newData)
      result := mload(0x0)
    }
  }

  function getBytes2(bytes32 data, uint256 position) internal returns(bytes32) {
    bytes32 mask = bytes32(0xFFFF) << ((32 - 2 - position) * 8);
    return (data & mask) >> ((32 - 2 - position) * 8);
  }

  function setBytes2(bytes32 data, uint256 position, uint256 newData) internal returns(bytes32 result) {
    assembly {
      mstore(0x0, data)
      mstore8(position,         div(and(newData, 0xFF00), exp(2, 8)))  // first byte
      mstore8(add(position, 1), newData)                               // second byte
      result := mload(0x0)
    }
  }

  function getBytes4(bytes32 data, uint256 position) internal returns(bytes32) {
    bytes32 mask = bytes32(0xFFFFFFFF) << ((32 - 4 - position) * 8);
    return (data & mask) >> ((32 - 4 - position) * 8);
  }

  function setBytes4(bytes32 data, uint256 position, uint256 newData) internal returns(bytes32 result) {
    assembly {
      mstore(0x0, data)
      mstore8(position,         div(and(newData, 0xFF000000), exp(2, 24)))  // first byte
      mstore8(add(position, 1), div(and(newData, 0x00FF0000), exp(2, 16)))  // second byte
      mstore8(add(position, 2), div(and(newData, 0x0000FF00), exp(2, 8 )))  // third byte
      mstore8(add(position, 3), newData)                                    // fourth byte
      result := mload(0x0)
    }
  }



  uint256 internal constant NONCE = 0;
  function getNonce(bytes32 data) internal returns(uint256) {
    return uint256(data.getBytes2(NONCE));
  }

  function setNonce(bytes32 data, uint256 nonce) internal returns(bytes32) {
    return data.setBytes2(NONCE, nonce);
  }

  uint256 internal constant LENGTH = 2;
  function getLength(bytes32 data) internal returns(uint256) {
    return uint256(data.getByte(LENGTH));
  }

  function setLength(bytes32 data, uint256 length) internal returns(bytes32) {
    return data.setByte(LENGTH, length);
  }

  uint256 internal constant FREQUENCY = 3;
  function getFrequency(bytes32 data) internal returns(uint256) {
    return uint256(data.getByte(FREQUENCY));
  }

  function setFrequency(bytes32 data, uint256 frequency) internal returns(bytes32) {
    return data.setByte(FREQUENCY, frequency);
  }

  uint256 internal constant COOLDOWN = 4;
  function getCooldown(bytes32 data) internal returns(uint256) {
    return uint256(data.getByte(COOLDOWN));
  }

  function setCooldown(bytes32 data, uint256 cooldown) internal returns(bytes32) {
    return data.setByte(COOLDOWN, cooldown);
  }

  uint256 internal constant STAKE = 5;
  function getStake(bytes32 data) internal returns(uint256) {
    return uint256(data.getBytes4(STAKE));
  }

  function setStake(bytes32 data, uint256 stake) internal returns(bytes32) {
    return data.setBytes4(STAKE, stake);
  }

  uint256 internal constant COMPLETED = 9;
  function getCompleted(bytes32 data) internal returns(uint256) {
    return uint256(data.getBytes2(COMPLETED));
  }

  function setCompleted(bytes32 data, uint256 completed) internal returns(bytes32) {
    return data.setBytes2(COMPLETED, completed);
  }

  uint256 internal constant STARTED = 11;
  function getStarted(bytes32 data) internal returns(uint256) {
    return uint256(data.getBytes4(STARTED));
  }

  function setStarted(bytes32 data, uint256 started) internal returns(bytes32) {
    return data.setBytes4(STARTED, started);
  }

  uint256 internal constant BONUS = 15;
  function getBonus(bytes32 data) internal returns(uint256) {
    return uint256(data.getBytes4(BONUS));
  }

  function setBonus(bytes32 data, uint256 bonus) internal returns(bytes32) {
    return data.setBytes4(BONUS, bonus);
  }

  uint256 internal constant MISSED = 19;
  function getMissed(bytes32 data) internal returns(uint256) {
    return uint256(data.getBytes2(MISSED));
  }

  function setMissed(bytes32 data, uint256 missed) internal returns(bytes32) {
    return data.setBytes2(MISSED, missed);
  }


}
