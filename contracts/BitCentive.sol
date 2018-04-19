pragma solidity 0.4.21;
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./Bytes32Lib.sol";


contract BitCentive is Ownable {
  using Bytes32Lib for bytes32;

  address public charity;

  mapping (address => mapping(uint256 => Campaign)) public campaigns;

  struct Campaign {
    bytes32 data;
    address trainer;
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
  //   byte charityPercentage; // percentage of penalty to give to charity
  //   byte trainerPercentage; // percentage of payout to give to trainer
  // }
  // ------------------------------------------------------------------
  // PUBLIC MUTABLE FUNCTIONS
  // ------------------------------------------------------------------
  function createCampaign(bytes32 data, address trainer) public payable {
    uint256 nonce = data.getNonce();
    require(msg.value < 3000 ether); // to avoid szabo overflow
    require(msg.value % 1 szabo == 0); // must be Szabo granularity
    require(campaigns[msg.sender][nonce].data.getStarted() == 0);
    require(msg.value != 0);
    require(data.getLength() != 0);
    require(data.getFrequency() != 0);
    require(data.getCharityPercentage() <= 100);
    require(data.getTrainerPercentage() <= 100);
    require(data.getCooldown() * data.getFrequency() < 168); // must be possible to complete the tasks in time
    require((msg.value / 1 szabo) % totalTasks(data) == 0);  // total stake must be divisible by number of tasks
    if (trainer == 0) {
      require(data.getTrainerPercentage() == 0);
    }

    campaigns[msg.sender][nonce].data = data
      .setStake(msg.value / 1 szabo)
      .setCompleted(0)
      .setStarted(now)
      .setBonus(0)
      .setMissed(0)
      .setLastCompleted(0);

    if (trainer != 0) {
      campaigns[msg.sender][nonce].trainer = trainer;
    }
  }

  function completeTaskSelf(uint16 nonce) public {
    bytes32 data = campaigns[msg.sender][nonce].data;
    require(campaigns[msg.sender][nonce].trainer == 0);
    completeTask(data, false, 0x0);
  }

  function completeTaskTrainer(uint16 nonce, uint256 timestamp, bool billable, uint8 v, bytes32 r, bytes32 s) public {
    bytes32 data = campaigns[msg.sender][nonce].data;
    address trainer = campaigns[msg.sender][nonce].trainer;
    bytes32 taskHash = sha256(this, msg.sender, nonce, timestamp, billable);
    require((now < timestamp + data.getCooldown()) && (now > timestamp - data.getCooldown()));
    require(ecrecover(keccak256("\x19Ethereum Signed Message:\n32", taskHash), v, r, s) == trainer);
    completeTask(data, billable, trainer);
  }

  function sponsor(address user, uint16 nonce) public payable {
    bytes32 data = campaigns[user][nonce].data;
    require(data.getStarted() != 0);
    require(msg.value % 1 szabo == 0); // must be Szabo granularity
    campaigns[user][nonce].data = data.setBonus(data.getBonus() + msg.value / 1 szabo);
  }

  function donate(bytes32 data) public payable {
    require(owner.call.value(msg.value)());
  }

  // ------------------------------------------------------------------
  // PRIVATE MUTABLE FUNCTIONS
  // ------------------------------------------------------------------
  function completeTask(bytes32 data, bool billable, address trainer) private {
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

    campaigns[msg.sender][data.getNonce()].data = data;

    sendPayout(data, completed, billable, trainer);
  }

  // ------------------------------------------------------------------
  // PRIVATE EXTERNALLY CALLING FUNCTIONS
  // ------------------------------------------------------------------
  function sendPayout(bytes32 data, bool completed, bool billable, address trainer) private {
    uint256 dueUser = 0;
    uint256 dueTrainer = 0;

    if (completed) {
      if (billable) {
        dueTrainer += trainerPayout(data);
      }
      dueUser += payout(data) - dueTrainer;
    }

    // only do penalty and bonus if its the last task
    if (finished(data) >= totalTasks(data)) {
      dueUser += processFinalTask(data);
    }

    if (dueTrainer > 0) {
      require(trainer.call.value(dueTrainer)());
    }
    if (dueUser > 0) {
      require(msg.sender.call.value(dueUser)());
    }
  }

  function processFinalTask(bytes32 data) private returns(uint256 refund) {
    uint256 penalty = 0;

    // lose bonus for each missed task
    uint256 potentialBonus = data.getBonus() * 1 szabo;
    uint256 bonus = potentialBonus * data.getCompleted() / totalTasks(data);
    refund += bonus;

    if (bonus < potentialBonus) {
      penalty += potentialBonus - bonus;
    }

    // the trainer portion of missed payouts is refunded to the user
    if (data.getMissed() > 0) {
      uint256 trainingRefund = data.getMissed() * trainerPayout(data);
      refund += trainingRefund;

      uint256 missedPayouts = data.getMissed() * payout(data);
      penalty += missedPayouts - trainingRefund;
    }

    if (penalty > 0) {
      sendPenalty(data, penalty);
    }
  }

  function sendPenalty(bytes32 data, uint256 penalty) private {
    uint256 dueCharity = penalty * data.getCharityPercentage() / uint256(100);
    if (dueCharity > 0) {
      require(charity.call.value(dueCharity)());
    }

    uint256 dueDeveloper = penalty - dueCharity;
    if (dueDeveloper > 0) {
      require(owner.call.value(dueDeveloper)());
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

  // amount per task
  function trainerPayout(bytes32 data) private view returns(uint256) {
    return payout(data) * data.getTrainerPercentage() / uint256(100);
  }

  // amount finished
  function finished(bytes32 data) private view returns(uint256) {
    return data.getCompleted() + data.getMissed();
  }
}
