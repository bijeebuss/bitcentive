using System.Collections.Generic;
using System.Threading.Tasks;
using Nethereum.Contracts;
using Nethereum.Web3;
using Nethereum.Web3.Accounts;

namespace bitcentive
{
  internal class EthereumService
  {
    public static EthereumService Instance { get; }
    public Web3 Web3 { get; }
    public string AccountAddress { get; }
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
      var account = new Account(_data.getPrivateKey());
      AccountAddress = account.Address;
      Web3 = new Web3(account, _config.Web3Url);
    }

    public async Task<EventSet> GetEventsFromBlockRange()
    {
      var abi = @"[{'constant':false,'inputs':[{'name':'a','type':'int256'}],'name':'multiply','outputs':[{'name':'r','type':'int256'}],'type':'function'},{'inputs':[{'name':'multiplier','type':'int256'}],'type':'constructor'},{'anonymous':false,'inputs':[{'indexed':true,'name':'a','type':'int256'},{'indexed':true,'name':'sender','type':'address'},{'indexed':false,'name':'result','type':'int256'}],'name':'Multiplied','type':'event'}]";

      var contractAddress = "";

      var contract = Web3.Eth.GetContract(abi, contractAddress);

      var multiplyFunction = contract.GetFunction("multiply");

      var multiplyEvent = contract.GetEvent("Multiplied");

      var filter7 = await multiplyEvent.CreateFilterAsync(7);

      return await multiplyEvent.GetFilterChanges<int>(filter7);
    }

  }
}
