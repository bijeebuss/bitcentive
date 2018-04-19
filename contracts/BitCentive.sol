pragma solidity 0.4.21;
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./Bytes32Lib.sol";


contract BitCentive is Ownable {
  using Bytes32Lib for bytes32;

  address public charity;

  mapping (address => mapping(uint256 => Campaign)) public campaigns;

  struct Campaign {
    bytes32 data;
    address judge;
  }

  event Log(bytes32 data);
  event Log(uint256 data);

  // struct Campaign {
  //   bytes2 nonce;
  //   byte length;            // weeks
  //   byte frequency;         // 1 = once per week
  //   byte cooldown;          // hours
  //   bytes4 stake;           // szabo
  //   bytes2 completed;       // tasks completed
  //   bytes4 started;         // timestamp
  //   bytes4 bonus;           // szabo
  //   bytes2 missed;          // tasks missed
  //   bytes4 lastCompleted;   // time of last completed task
  //   byte percentage;        // percentage of penalty to give to charity
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
    require(data.getPercentage() <= 100);
    require(data.getCooldown() * data.getFrequency() < 168); // must be possible to complete the tasks in time
    require((msg.value / 1 szabo) % totalTasks(data) == 0);  // total stake must be divisible by number of tasks

    campaigns[msg.sender][nonce].data = data
      .setStake(msg.value / 1 szabo)
      .setCompleted(0)
      .setStarted(now)
      .setBonus(0)
      .setMissed(0)
      .setLastCompleted(0);

    if (judge != 0) {
      campaigns[msg.sender][nonce].judge = judge;
    }
  }

  function completeTask(uint16 nonce) public {
    bytes32 data = campaigns[msg.sender][nonce].data;
    require(campaigns[msg.sender][nonce].judge == 0);
    require(data.getStarted() != 0);
    require(now - data.getLastCompleted() > data.getCooldown() * 1 hours);
    require(finished(data) < totalTasks(data));
    require(finished(data) < due(data) + data.getFrequency());

    uint256 recentlyMissed = 0;
    if (finished(data) < due(data)) {
      recentlyMissed = due(data) - finished(data);
      data = data.setMissed(data.getMissed() + recentlyMissed);
    }

    bool completed = false;
    if (finished(data) < totalTasks(data)) {
      completed = true;
      data = data
        .setCompleted(data.getCompleted() + 1)
        .setLastCompleted(now);
    }

    campaigns[msg.sender][nonce].data = data;

    sendPayout(data, completed);
  }

  // function completeTaskSig(uint32 data) public {

  // }

  function sponsor(address user, uint16 nonce) public payable {
    bytes32 data = campaigns[user][nonce].data;
    require(data.getStarted() != 0);
    require(msg.value % 1 szabo == 0); // must be Szabo granularity
    campaigns[user][nonce].data = data.setBonus(data.getBonus() + msg.value / 1 szabo);
  }

  function donate(uint32 data) public payable {
    require(owner.call.value(msg.value)());
  }

  // ------------------------------------------------------------------
  // PRIVATE EXTERNALLY CALLING FUNCTIONS
  // ------------------------------------------------------------------
  function sendPayout(bytes32 data, bool completed) private {
    uint256 userPayout = 0;
    uint256 penaltyPayout = 0;

    if (completed) {
      userPayout += payout(data);
    }
    // only do bonus and missed once it's finished
    if (finished(data) >= totalTasks(data)) {
      // bonus
      uint256 potentialBonus = data.getBonus() * 1 szabo;
      uint256 bonusPayout = potentialBonus * data.getCompleted() / totalTasks(data);
      userPayout += bonusPayout;
      if (bonusPayout < potentialBonus) {
        penaltyPayout += potentialBonus - bonusPayout;
      }

      // missed
      if (data.getMissed() > 0) {
        penaltyPayout += data.getMissed() * payout(data);
      }
    }
    if (penaltyPayout > 0) {
      sendPenalty(penaltyPayout);
    }
    if (userPayout > 0) {
      require(msg.sender.call.value(userPayout)());
    }
  }

  function sendPenalty(bytes32 data, uint256 penaltyPayout) private {
    uint256 charityPayout = penaltyPayout * data.getPercentage() / uint256(100);
    if (charityPayout > 0) {
      require(charity.call.value(charityPayout)());
    }

    uint256 developerPayout = penaltyPayout - charityPayout;
    if (developerPayout > 0) {
      require(owner.call.value(charityPayout)());
    }
  }

  // ------------------------------------------------------------------
  // PRIVATE CONSTANT FUNCTIONS
  // ------------------------------------------------------------------
  // number of tasks that are required to be completed by now
  function due(bytes32 data) private view returns(uint256) {
    uint256 fullWeeksElapsed = (now - data.getStarted()) / 1 weeks; // flooring division
    uint256 tasksDue = fullWeeksElapsed * data.getFrequency();
    return tasksDue > totalTasks(data) ? totalTasks(data) : tasksDue;
  }

  // total possible tasks
  function totalTasks(bytes32 data) private view returns(uint256) {
    return data.getFrequency() * data.getLength();
  }

  // amount per task
  function payout(bytes32 data) private view returns(uint256) {
    return data.getStake() / totalTasks(data) * 1 szabo;
  }

  // amount finished
  function finished(bytes32 data) private view returns(uint256) {
    return data.getCompleted() + data.getMissed();
  }
}
