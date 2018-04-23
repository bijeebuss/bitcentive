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
  event Log(address data);

  // struct Campaign {
  //   bytes2 nonce;
  //   byte length;            // weeks
  //   byte frequency;         // 1 = once per week
  //   byte cooldown;          // hours
  //   bytes4 stake;           // szabo
  //   bytes2 completed;       // checkins completed
  //   bytes4 started;         // timestamp
  //   bytes4 bonus;           // szabo
  //   bytes2 missed;          // checkins missed
  //   bytes4 lastCompleted;   // time of last completed checkin
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
    require(data.getCooldown() * data.getFrequency() < 168); // must be possible to complete the checkins in time
    require((msg.value / 1 szabo) % totalCheckins(data) == 0);  // total stake must be divisible by number of checkins
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

  function checkinSelf(uint16 nonce) public {
    bytes32 data = campaigns[msg.sender][nonce].data;
    require(campaigns[msg.sender][nonce].trainer == 0);
    checkin(msg.sender, data, false, 0x0);
  }

  function checkinTrainer(uint16 nonce, uint256 timestamp, bool billable, uint8 v, bytes32 r, bytes32 s) public {
    bytes32 data = campaigns[msg.sender][nonce].data;
    address trainer = campaigns[msg.sender][nonce].trainer;
    bytes32 checkinHash = keccak256(this, msg.sender, nonce, timestamp, billable);
    uint256 deadline = timestamp + data.getCooldown() * 1 hours / 2;
    uint256 open = timestamp - data.getCooldown() * 1 hours / 2;
    require(now < deadline && now > open);
    require(ecrecover(keccak256("\x19Ethereum Signed Message:\n32", checkinHash), v, r, s) == trainer);
    checkin(msg.sender, data, billable, trainer);

    Log(timestamp);
    Log(now);
  }

  function endCampaign(address user, uint16 nonce) public {
    bytes32 data = campaigns[user][nonce].data;
    require(due(data) >= totalCheckins(data));
    checkin(user, data, false, campaigns[user][nonce].trainer);
  }

  function sponsor(address user, uint16 nonce) public payable {
    bytes32 data = campaigns[user][nonce].data;
    require(data.getStarted() != 0);
    require(msg.value % 1 szabo == 0); // must be Szabo granularity
    campaigns[user][nonce].data = data.setBonus(data.getBonus() + msg.value / 1 szabo);
  }

  function donate(bytes32 data) public payable {
    require(data.getCharityPercentage() <= 100);
    uint256 dueCharity = msg.value * data.getCharityPercentage() / uint256(100);
    uint256 dueDeveloper = msg.value - dueCharity;
    if (dueCharity > 0) {
      require(charity.call.value(dueCharity)());
    }
    if (dueDeveloper > 0) {
      require(owner.call.value(dueDeveloper)());
    }
  }

  // ------------------------------------------------------------------
  // PRIVATE MUTABLE FUNCTIONS
  // ------------------------------------------------------------------
  function checkin(address user, bytes32 data, bool billable, address trainer) private {
    require(data.getStarted() != 0);
    require(now - data.getLastCompleted() > data.getCooldown() * 1 hours);
    require(finished(data) < totalCheckins(data));
    require(finished(data) < due(data) + data.getFrequency());

    uint256 recentlyMissed = 0;
    if (finished(data) < due(data)) {
      recentlyMissed = due(data) - finished(data);
      data = data.setMissed(data.getMissed() + recentlyMissed);
    }

    bool completed = false;
    if (finished(data) < totalCheckins(data)) {
      completed = true;
      data = data
        .setCompleted(data.getCompleted() + 1)
        .setLastCompleted(now);
    }

    campaigns[user][data.getNonce()].data = data;

    sendPayout(user, data, completed, billable, trainer);
  }

  function setCharity(address newCharity) public onlyOwner {
    charity = newCharity;
  }

  // ------------------------------------------------------------------
  // PRIVATE EXTERNALLY CALLING FUNCTIONS
  // ------------------------------------------------------------------
  function sendPayout(address user, bytes32 data, bool completed, bool billable, address trainer) private {
    uint256 dueUser = 0;
    uint256 dueTrainer = 0;

    if (completed) {
      if (billable) {
        dueTrainer += trainerPayout(data);
      }
      dueUser += payout(data) - dueTrainer;
    }

    // only do penalty and bonus if its the last checkin
    if (finished(data) >= totalCheckins(data)) {
      dueUser += processFinalCheckin(data);
    }

    if (dueTrainer > 0) {
      require(trainer.call.value(dueTrainer)());
    }
    if (dueUser > 0) {
      require(user.call.value(dueUser)());
    }
  }

  function processFinalCheckin(bytes32 data) private returns(uint256 refund) {
    uint256 penalty = 0;

    // lose bonus for each missed checkin
    uint256 potentialBonus = data.getBonus() * 1 szabo;
    uint256 bonus = potentialBonus * data.getCompleted() / totalCheckins(data);
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
  // number of checkins that are required to be completed by now
  function due(bytes32 data) private view returns(uint256) {
    uint256 fullWeeksElapsed = (now - data.getStarted()) / 1 weeks; // flooring division
    uint256 checkinsDue = fullWeeksElapsed * data.getFrequency();
    return checkinsDue > totalCheckins(data) ? totalCheckins(data) : checkinsDue;
  }

  // total possible checkins
  function totalCheckins(bytes32 data) private view returns(uint256) {
    return data.getFrequency() * data.getLength();
  }

  // amount per checkin
  function payout(bytes32 data) private view returns(uint256) {
    return data.getStake() / totalCheckins(data) * 1 szabo;
  }

  // amount per checkin
  function trainerPayout(bytes32 data) private view returns(uint256) {
    return payout(data) * data.getTrainerPercentage() / uint256(100);
  }

  // amount finished
  function finished(bytes32 data) private view returns(uint256) {
    return data.getCompleted() + data.getMissed();
  }
}
