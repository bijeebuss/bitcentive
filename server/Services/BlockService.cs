using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Hangfire;
using Nethereum.Contracts;
using Nethereum.Hex.HexTypes;
using Nethereum.Web3;

namespace bitcentive
{
  internal class BlockService
  {
    private readonly DataService _data;
    private readonly EthereumService _ethereum;
    private readonly ConfigurationService _config;

    public BlockService()
    {
      _data = DataService.Instance;
      _ethereum = EthereumService.Instance;
    }

    // meant to run every minute
    public async Task CheckForNewBlocks()
    {
      for (int i = 0; i < 4; i++)
      {
        var latestBlock = Convert.ToInt32(await _ethereum.Web3.Eth.Blocks.GetBlockNumber.SendRequestAsync());
        int lastBlockProcessed = _data.GetLastBlockProcessed();

        // only process blocks that are fully confirmed
        var fullConfirmationTime = 6;
        var blockDifference = latestBlock - lastBlockProcessed;
        var missingBlocks = blockDifference - fullConfirmationTime;

        if (blockDifference < 0)
          throw new Exception("Processed block should not be greater than current block");

        if (missingBlocks > 0)
        {
          if (missingBlocks > _config.MaxBatchSize)
          {
            missingBlocks = _config.MaxBatchSize;
          }
          BackgroundJob.Enqueue<BlockService>(b => b.ProcessBlocks(lastBlockProcessed + 1, missingBlocks));
        }

        Thread.Sleep(15000);
      }
    }

    private async Task ProcessBlocks(int startingBlock, int numOfBlocks)
    {
      var events = await _ethereum.GetEventsFromBlockRange();

      for (var block = startingBlock; block < startingBlock + numOfBlocks; block++)
      {
        try
        {
          await ProcessBlock(block, events.Find(e => e.Log.BlockNumber.Value == block));
        }
        catch (Exception ex)
        {
          throw new Exception($"Failed to process block: {block}", ex);
        }
      }
    }

    private async Task ProcessBlock(int block, EventSet events)
    {
      _data.BeginProcessingBlock(block);
      var events = _ethereum.Get
    }
  }
}
