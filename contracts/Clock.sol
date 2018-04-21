pragma solidity 0.4.21;


contract Clock {
  function time() public returns(uint256) {
    return now;
  }
}
