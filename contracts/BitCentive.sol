pragma solidity 0.4.21;
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./Bytes32Lib.sol";


contract BitCentive is Ownable {
  using Bytes32Lib for bytes32;

  mapping (address => mapping(uint256 => Campaign)) public campaigns;

  struct Campaign {
    bytes32 data;
    address judge;
  }

  event Log(bytes32 data);
  event Log(uint256 data);

  // struct Campaign {
  //   bytes2 nonce;
  //   byte length;     // weeks
  //   byte frequency;  // 1 = once per week
  //   byte cooldown;   // hours
  //   bytes4 stake;    // szabo
  //   bytes2 completed;// tasks completed
  //   bytes4 started;  // timestamp
  //   bytes4 bonus;    // szabo
  //   bytes2 missed;   // tasks missed
  // }
  // ------------------------------------------------------------------
  // PUBLIC MUTABLE FUNCTIONS
  // ------------------------------------------------------------------
  function createCampaign(bytes32 data, address judge) public payable {
    uint256 nonce = data.getNonce();
    require(msg.value < 3000 ether); // to avoid szabo overflow
    require(msg.value % 1 szabo == 0); // must be Szabo granularity
    require(campaigns[msg.sender][nonce].data.getStarted() == 0);
    require(msg.value != 0);
    require(data.getLength() != 0);
    require(data.getFrequency() != 0);
    require(data.getCooldown() * data.getFrequency() < 168); // must be possible to complete the tasks in time
    require((msg.value / 1 szabo) % (data.getLength() * data.getFrequency()) == 0); // total stake must be divisible by number of tasks

    campaigns[msg.sender][nonce].data = data
      .setStake(msg.value / 1 szabo)
      .setCompleted(0)
      .setStarted(now)
      .setBonus(0)
      .setMissed(0);

    if (judge != 0) {
      campaigns[msg.sender][nonce].judge = judge;
    }
  }

  // function completeTask(uint32 data) public {

  // }

  // function completeTaskSig(uint32 data) public {

  // }

  // function sponsor(uint32 data) public {

  // }

  // function donate(uint32 data) public payable {

  // }

  // function punish(uint32 data) public {

  // }
}
