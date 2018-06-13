pragma solidity 0.4.24;


contract Clock {
  function time() public view returns(uint256) {
    return now;
  }
}
