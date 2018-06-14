using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Numerics;
using Dapper;
using Microsoft.Extensions.Configuration;
using Nethereum.Signer;

namespace bitcentive
{
  public class DataService
  {
    public static DataService Instance { get; }

    static DataService()
    {
      Instance = new DataService();
    }
    private readonly string _connectionString = ConfigurationExtensions.GetConnectionString(ConfigurationService.Instance.Config, "DefaultConnection");

    internal string GetPrivateKey()
    {
      using (var c = new SqlConnection(_connectionString))
      {
        c.Open();
        return c.QuerySingle<string>(nameof(GetPrivateKey), commandType: CommandType.StoredProcedure);
      }
    }

    internal Guid GenerateAccessToken(string address)
    {
      using (var c = new SqlConnection(_connectionString))
      {
        c.Open();
        return c.QuerySingle<Guid>(nameof(GenerateAccessToken), new { address }, commandType: CommandType.StoredProcedure);
      }
    }

    internal ContractData GetContract()
    {
      using (var c = new SqlConnection(_connectionString))
      {
        c.Open();
        return c.QuerySingle<ContractData>(nameof(GetContract), commandType: CommandType.StoredProcedure);
      }
    }

    internal int? GetLastProcessedBlock()
    {
      using (var c = new SqlConnection(_connectionString))
      {
        c.Open();
        return c.ExecuteScalar<int?>(nameof(GetLastProcessedBlock), commandType: CommandType.StoredProcedure);
      }
    }

    internal bool ValidateAccessToken(Guid token, string address)
    {
      using (var c = new SqlConnection(_connectionString))
      {
        c.Open();
        return c.Execute(nameof(ValidateAccessToken), new { token, address }, commandType: CommandType.StoredProcedure) > 0;
      }
    }

    // returns the address if the token is validated
    internal string CheckAccessToken(Guid token)
    {
      using (var c = new SqlConnection(_connectionString))
      {
        c.Open();
        return c.ExecuteScalar<string>(nameof(CheckAccessToken), new { token }, commandType: CommandType.StoredProcedure);
      }
    }

    internal IEnumerable<Campaign> GetCampaigns(string address)
    {
      using (var c = new SqlConnection(_connectionString))
      {
        c.Open();
        return c.Query<Campaign>(nameof(GetCampaigns), new { address }, commandType: CommandType.StoredProcedure);
      }
    }

    internal bool SetLastProcessedBlock(int block)
    {
      using (var c = new SqlConnection(_connectionString))
      {
        c.Open();
        return c.Execute(nameof(SetLastProcessedBlock), new { block }, commandType: CommandType.StoredProcedure) > 0;
      }
    }

    internal bool BeginProcessingBlock(int block, int skippedBlocks)
    {
      using (var c = new SqlConnection(_connectionString))
      {
        c.Open();
        return c.Execute(nameof(BeginProcessingBlock), new { block, skippedBlocks }, commandType: CommandType.StoredProcedure) > 0;
      }
    }

    internal void CreateCampaign(CreateCampaign @event)
    {
      using (var c = new SqlConnection(_connectionString))
      {
        c.Open();
        c.Execute(nameof(CreateCampaign), commandType: CommandType.StoredProcedure);
        // c.Execute(nameof(CreateCampaign), @event, commandType: CommandType.StoredProcedure);
      }
    }

    internal void RevertBlock(int block)
    {
    }

    internal bool FinishProcessingBlock(int block)
    {
      using (var c = new SqlConnection(_connectionString))
      {
        c.Open();
        return c.Execute(nameof(FinishProcessingBlock), new { block }, commandType: CommandType.StoredProcedure) > 0;
      }
    }
  }
}
