using System.Collections.Generic;
using System.Linq;
using System.Numerics;
using System.Threading.Tasks;
using Nethereum.Contracts;
using Nethereum.Hex.HexTypes;
using Nethereum.RPC.Eth.DTOs;
using Nethereum.Web3;
using Nethereum.Web3.Accounts;

namespace bitcentive
{
  internal class EthereumService
  {
    public static EthereumService Instance { get; }
    public Web3 Web3 { get; }
    public string AccountAddress { get; }
    public Contract BitCentive { get; private set; }

    private readonly ConfigurationService _config;
    private readonly DataService _data;

    static EthereumService()
    {
      Instance = new EthereumService();
    }

    public EthereumService()
    {
      _config = ConfigurationService.Instance;
      _data = DataService.Instance;
      var account = new Account(_data.GetPrivateKey());
      AccountAddress = account.Address;
      Web3 = new Web3(account, _config.Web3Url);

      // setup contract
      var contractData = _data.GetContract();
      BitCentive = Web3.Eth.GetContract(contractData.Abi, contractData.Address);
    }

    public async Task<List<IEventLog>> GetEventsFromBlockRange(BigInteger startingBlock, BigInteger endingBlock)
    {
      var createCampaignEvent = BitCentive.GetEvent(nameof(CreateCampaign));
      var fromBlock = new BlockParameter(new HexBigInteger(startingBlock));
      var toBlock = new BlockParameter(new HexBigInteger(endingBlock));
      var filterInput = createCampaignEvent.CreateFilterInput(fromBlock, toBlock);
      var list = await createCampaignEvent.GetAllChanges<CreateCampaign>(filterInput);
      return list.Select(e => (IEventLog)e).ToList();
    }

  }
}
