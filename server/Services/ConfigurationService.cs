using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using System.IO;

namespace bitcentive
{
  public class ConfigurationService
  {
    public static ConfigurationService Instance { get; set; }

    public Environments Environment { get; set; }
    public IConfigurationRoot Config { get; }

    public ConfigurationService(IHostingEnvironment env)
    {
      var builder = new ConfigurationBuilder()
        .SetBasePath(Directory.GetCurrentDirectory())
        .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
        .AddJsonFile($"appsettings.{env.EnvironmentName}.json", optional: true)
        .AddEnvironmentVariables();
      Config = builder.Build();
    }

    public string GetArtifacts(string contractName)
    {
      return File.ReadAllText(Config["Ethereum:ArtifactsPath"] + contractName);
    }

    public string Web3Url {
      get {
        return Config["Ethereum:Web3Url"];
      }
    }

    public int MaxBatchSize {
      get {
        return System.Convert.ToInt32(Config["BlockService:MaxBatchSize"]);
      }
    }

    public int BlockServiceDelayMinutes {
      get {
        return System.Convert.ToInt32(Config["BlockService:BlockServiceDelayMinutes"]);
      }
    }

    public int BlockTime {
      get {
        return System.Convert.ToInt32(Config["BlockService:BlockTime"]);
      }
    }

    public enum Environments { Development, Rinkeby }
  }
}
