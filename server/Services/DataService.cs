using System;
using System.Data;
using System.Data.SqlClient;
using Dapper;
using Microsoft.Extensions.Configuration;
using Nethereum.Signer;

namespace bitcentive
{
  internal class DataService
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
  }
}
