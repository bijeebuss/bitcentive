pragma solidity 0.4.21;


contract Clock {
  function time() public view returns(uint256) {
    return now;
  }
}
