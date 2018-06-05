using System.Threading.Tasks;

namespace bitcentive
{
  internal class BlockService
  {
    private readonly DataService _data;
    private readonly EthereumService _ethereum;

    public BlockService()
    {
        _data = DataService.Instance;
        _ethereum = EthereumService.Instance;
    }

    public async Task CheckForNewBlocks() {
      var myblock = await _ethereum.Web3.Eth.Blocks.GetBlockNumber.SendRequestAsync();
      var type = myblock.GetType();
    }
  }
}
