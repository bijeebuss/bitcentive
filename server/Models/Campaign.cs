using System;
using System.Numerics;

namespace bitcentive
{
  public class Campaign
  {
    int CampaignId { get; set; }
    int UserId { get; set; }
    int Nonce { get; set; }
    int Frequency { get; set; }
    int Cooldown { get; set; }
    BigInteger Stake { get; set; }
    int Completed { get; set; }
    int Started { get; set; }
    BigInteger Bonus { get; set; }
    int Missed { get; set; }
    int LastCompleted { get; set; }
    int CharityPercentage { get; set; }
    int TrainerPercentage { get; set; }
    string Trainer { get; set; }
  }
}
