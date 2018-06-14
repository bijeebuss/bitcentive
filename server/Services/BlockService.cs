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
  [AutomaticRetry(Attempts = 0)]
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
        var latestBlock = (int)(await _ethereum.Web3.Eth.Blocks.GetBlockNumber.SendRequestAsync()).Value;
        int? lastBlockProcessed = _data.GetLastProcessedBlock();

        // last batch still processing
        if(lastBlockProcessed == null)
        {
          Thread.Sleep(_config.BlockTime);
          continue;
        }

        // only process blocks that are fully confirmed
        var fullConfirmationTime = 6;
        var blockDifference = latestBlock - lastBlockProcessed.Value;
        var missingBlocks = blockDifference - fullConfirmationTime + 1;

        if (blockDifference < 0)
          throw new Exception("Processed block should not be greater than current block");

        if (missingBlocks > 0)
        {
          if (missingBlocks > _config.MaxBatchSize)
            missingBlocks = _config.MaxBatchSize;

          BackgroundJob.Enqueue<BlockService>(b => b.ProcessBlockBatch(lastBlockProcessed.Value + 1, lastBlockProcessed.Value + missingBlocks));
        }

        if(missingBlocks < _config.MaxBatchSize)
          Thread.Sleep(_config.BlockTime);
      }
    }

    public async Task ProcessBlockBatch(int startingBlock, int endingBlock)
    {
      var events = (await _ethereum.GetEventsFromBlockRange(startingBlock, endingBlock))
        .GroupBy(e => e.Log.BlockNumber.Value)
        .OrderBy(g => g.Key);

      var lastBlock = startingBlock - 1;
      foreach (var group in events)
      {
        var block = (int)group.Key;
        try
        {
          ProcessBlock(block, block - lastBlock - 1, group.OrderBy(e => e.Log.LogIndex.Value));
          lastBlock = block;
        }
        catch (Exception ex)
        {
          throw new Exception($"Failed to process block: {group.Key}", ex);
        }
      }

      // empty blocks at the end
      if(lastBlock != endingBlock)
        if(!_data.SetLastProcessedBlock(endingBlock))
          throw new Exception($"Could not set last processed block: {endingBlock}");
    }

    private void ProcessBlock(int block, int skippedBlocks, IEnumerable<IEventLog> events)
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
