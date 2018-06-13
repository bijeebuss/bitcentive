pragma solidity 0.4.24;


library Bytes32Lib {
  using Bytes32Lib for bytes32;

  function getByte(bytes32 data, uint256 position) internal pure returns(uint256) {
    uint256 mask = uint256(0xFF) << ((32 - 1 - position) * 8);
    return (uint256(data) & mask) >> ((32 - 1 - position) * 8);
  }

  function setByte(bytes32 data, uint256 position, uint256 newData) internal pure returns(bytes32 result) {
    assembly {
      mstore(0x0, data)
      mstore8(position, newData)
      result := mload(0x0)
    }
  }

  function getBytes2(bytes32 data, uint256 position) internal pure returns(uint256) {
    uint256 mask = uint256(0xFFFF) << ((32 - 2 - position) * 8);
    return (uint256(data) & mask) >> ((32 - 2 - position) * 8);
  }

  function setBytes2(bytes32 data, uint256 position, uint256 newData) internal pure returns(bytes32 result) {
    assembly {
      mstore(0x0, data)
      mstore8(position,         div(and(newData, 0xFF00), exp(2, 8)))  // first byte
      mstore8(add(position, 1), newData)                               // second byte
      result := mload(0x0)
    }
  }

  function getBytes4(bytes32 data, uint256 position) internal pure returns(uint256) {
    uint256 mask = uint256(0xFFFFFFFF) << ((32 - 4 - position) * 8);
    return (uint256(data) & mask) >> ((32 - 4 - position) * 8);
  }

  function setBytes4(bytes32 data, uint256 position, uint256 newData) internal pure returns(bytes32 result) {
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
  uint256 internal constant LENGTH = 2;
  uint256 internal constant FREQUENCY = 3;
  uint256 internal constant COOLDOWN = 4;
  uint256 internal constant STAKE = 5;
  uint256 internal constant COMPLETED = 9;
  uint256 internal constant STARTED = 11;
  uint256 internal constant BONUS = 15;
  uint256 internal constant MISSED = 19;
  uint256 internal constant LAST_COMPLETED = 21;
  uint256 internal constant CHARITY_PERCENTAGE = 25;
  uint256 internal constant TRAINER_PERCENTAGE = 26;

  function getNonce(bytes32 data) internal pure returns(uint256) {
    return data.getBytes2(NONCE);
  }

  function setNonce(bytes32 data, uint256 nonce) internal pure returns(bytes32) {
    return data.setBytes2(NONCE, nonce);
  }

  function getLength(bytes32 data) internal pure returns(uint256) {
    return data.getByte(LENGTH);
  }

  function setLength(bytes32 data, uint256 length) internal pure returns(bytes32) {
    return data.setByte(LENGTH, length);
  }

  function getFrequency(bytes32 data) internal pure returns(uint256) {
    return data.getByte(FREQUENCY);
  }

  function setFrequency(bytes32 data, uint256 frequency) internal pure returns(bytes32) {
    return data.setByte(FREQUENCY, frequency);
  }

  function getCooldown(bytes32 data) internal pure returns(uint256) {
    return data.getByte(COOLDOWN);
  }

  function setCooldown(bytes32 data, uint256 cooldown) internal pure returns(bytes32) {
    return data.setByte(COOLDOWN, cooldown);
  }

  function getStake(bytes32 data) internal pure returns(uint256) {
    return data.getBytes4(STAKE);
  }

  function setStake(bytes32 data, uint256 stake) internal pure returns(bytes32) {
    return data.setBytes4(STAKE, stake);
  }

  function getCompleted(bytes32 data) internal pure returns(uint256) {
    return data.getBytes2(COMPLETED);
  }

  function setCompleted(bytes32 data, uint256 completed) internal pure returns(bytes32) {
    return data.setBytes2(COMPLETED, completed);
  }

  function getStarted(bytes32 data) internal pure returns(uint256) {
    return data.getBytes4(STARTED);
  }

  function setStarted(bytes32 data, uint256 started) internal pure returns(bytes32) {
    return data.setBytes4(STARTED, started);
  }

  function getBonus(bytes32 data) internal pure returns(uint256) {
    return data.getBytes4(BONUS);
  }

  function setBonus(bytes32 data, uint256 bonus) internal pure returns(bytes32) {
    return data.setBytes4(BONUS, bonus);
  }

  function getMissed(bytes32 data) internal pure returns(uint256) {
    return data.getBytes2(MISSED);
  }

  function setMissed(bytes32 data, uint256 missed) internal pure returns(bytes32) {
    return data.setBytes2(MISSED, missed);
  }

  function getLastCompleted(bytes32 data) internal pure returns(uint256) {
    return data.getBytes4(LAST_COMPLETED);
  }

  function setLastCompleted(bytes32 data, uint256 lastCompleted) internal pure returns(bytes32) {
    return data.setBytes4(LAST_COMPLETED, lastCompleted);
  }

  function getCharityPercentage(bytes32 data) internal pure returns(uint256) {
    return data.getByte(CHARITY_PERCENTAGE);
  }

  function setCharityPercentage(bytes32 data, uint256 charityPercentage) internal pure returns(bytes32) {
    return data.setByte(CHARITY_PERCENTAGE, charityPercentage);
  }

   function getTrainerPercentage(bytes32 data) internal pure returns(uint256) {
    return data.getByte(TRAINER_PERCENTAGE);
  }

  function setTrainerPercentage(bytes32 data, uint256 trainerPercentage) internal pure returns(bytes32) {
    return data.setByte(TRAINER_PERCENTAGE, trainerPercentage);
  }

}
