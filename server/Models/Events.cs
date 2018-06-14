using System.Collections.Generic;
using Nethereum.ABI.FunctionEncoding.Attributes;
using Nethereum.Contracts;

namespace bitcentive
{
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
    [Parameter("address", "user", 1, false)]
    public string User {get; set;}

    [Parameter("bytes32", "data", 2, false)]
    public byte[] Data {get; set;}

    [Parameter("address", "trainer", 3, false)]
    public string Trainer {get; set;}
  }

  // event CreateCampaign(bytes32 data, address trainer);
  // event Checkin(address user, uint16 nonce);
  // event Sponsor(address user, uint16 nonce);
  // event Donate(bytes32 data);
  // event UpdateCharityPercentage(uint16 nonce, uint8 charityPercentage);
}
