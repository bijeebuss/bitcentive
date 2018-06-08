using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
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

    internal string getPrivateKey()
    {
      using (var c = new SqlConnection(_connectionString))
      {
        c.Open();
        return c.QuerySingle<string>("GetPrivateKey", commandType: CommandType.StoredProcedure);
      }
    }

    internal Guid GenerateAccessToken(string address)
    {
      using (var c = new SqlConnection(_connectionString))
      {
        c.Open();
        return c.QuerySingle<Guid>("GenerateAccessToken", new { address }, commandType: CommandType.StoredProcedure);
      }
    }

    internal bool ValidateAccessToken(Guid token, string address)
    {
      using (var c = new SqlConnection(_connectionString))
      {
        c.Open();
        return c.Execute("ValidateAccessToken", new { token, address }, commandType: CommandType.StoredProcedure) > 0;
      }
    }

    // returns the address if the token is validated
    internal string CheckAccessToken(Guid token)
    {
      using (var c = new SqlConnection(_connectionString))
      {
        c.Open();
        return c.ExecuteScalar<string>("CheckAccessToken", new { token }, commandType: CommandType.StoredProcedure);
      }
    }

    internal IEnumerable<Campaign> GetCampaigns(string address)
    {
      using (var c = new SqlConnection(_connectionString))
      {
        c.Open();
        return c.Query<Campaign>("GetCampaigns", new { address }, commandType: CommandType.StoredProcedure);
      }
    }
  }
}
