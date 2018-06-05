using Nethereum.Web3;
using Nethereum.Web3.Accounts;

namespace bitcentive
{
  internal class EthereumService
  {
    public static EthereumService Instance { get; }
    public Web3 Web3 { get; }
    public string AccountAddress{ get; }
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

  }
}
