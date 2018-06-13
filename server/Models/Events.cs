using System.Collections.Generic;
using Nethereum.Contracts;

namespace bitcentive
{
  class EventSet
  {
    List<EventLog<CreateCampaign>> CreateCampaign {get; set;}
    List<EventLog<Checkin>> Checkin {get; set;}
    List<EventLog<Sponsor>> Sponsor {get; set;}
    List<EventLog<UpdateCharityPercentage>> UpdateCharityPercentage {get; set;}
  }

  internal class UpdateCharityPercentage
  {
  }

  internal class Donate
  {
  }

  internal class Sponsor
  {
  }

  internal class Checkin
  {
  }

  public class CreateCampaign
  {
  }

  // event CreateCampaign(bytes32 data, address trainer);
  // event Checkin(address user, uint16 nonce);
  // event Sponsor(address user, uint16 nonce);
  // event Donate(bytes32 data);
  // event UpdateCharityPercentage(uint16 nonce, uint8 charityPercentage);
}
