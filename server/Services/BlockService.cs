using System;
using System.Collections.Generic;
using System.Linq;
using System.Numerics;
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
      _config = ConfigurationService.Instance;
    }

    public async Task CheckForNewBlocks()
    {
      for (int i = 0; i < (_config.BlockServiceDelayMinutes * 60000) / _config.BlockTime; i++)
      {
        var latestBlock = await _ethereum.Web3.Eth.Blocks.GetBlockNumber.SendRequestAsync();
        int? lastBlockProcessed = _data.GetLastBlockProcessed();

        // last batch still processing
        if(lastBlockProcessed == null)
        {
          Thread.Sleep(_config.BlockTime);
          continue;
        }

        // only process blocks that are fully confirmed
        var fullConfirmationTime = 6;
        var blockDifference = latestBlock.Value - lastBlockProcessed.Value;
        var missingBlocks = blockDifference - fullConfirmationTime;

        if (blockDifference < 0)
          throw new Exception("Processed block should not be greater than current block");

        if (missingBlocks > 0)
        {
          if (missingBlocks > _config.MaxBatchSize)
            missingBlocks = _config.MaxBatchSize;

          BackgroundJob.Enqueue<BlockService>(b => b.ProcessBlockBatch(lastBlockProcessed.Value + 1, missingBlocks));
        }

        if(missingBlocks < _config.MaxBatchSize)
          Thread.Sleep(_config.BlockTime);
      }
    }

    private async Task ProcessBlockBatch(BigInteger startingBlock, BigInteger numOfBlocks)
    {
      var events = (await _ethereum.GetEventsFromBlockRange(startingBlock, numOfBlocks))
        .GroupBy(e => e.Log.BlockNumber.Value)
        .OrderBy(g => g.Key);

      var skippedBlocks = 0;
      foreach (var group in events)
      {
        if (group.Count() == 0)
        {
          skippedBlocks += 1;
          continue;
        }
        try
        {
          ProcessBlock(group.Key, skippedBlocks, group.OrderBy(e => e.Log.LogIndex.Value));
          skippedBlocks = 0;
        }
        catch (Exception ex)
        {
          throw new Exception($"Failed to process block: {group.Key}", ex);
        }
      }

      if(skippedBlocks > 0)
        if(!_data.SetLastProcessedBlock(startingBlock + numOfBlocks))
          throw new Exception($"Could not set last processed block: {startingBlock + numOfBlocks}");
    }

    private void ProcessBlock(BigInteger block, int skippedBlocks, IEnumerable<IEventLog> events)
    {
      if(!_data.BeginProcessingBlock(block, skippedBlocks))
        throw new Exception("Could not get block processing lock");

      try
      {
        foreach (var e in events)
        {
          switch (e)
          {
            case EventLog<CreateCampaign> subEvent:
              _data.CreateCampaign(subEvent.Event);
              break;
            default:
              throw new Exception($"unexpected event type {e.Log.Type}");
          }
        }
      }
      catch(Exception)
      {
        _data.RevertBlock(block);
        throw;
      }

      if(!_data.FinishProcessingBlock(block))
        throw new Exception($"Could not get finish processing block {block}");
    }
  }
}
