﻿using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Hangfire;
using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace bitcentive
{
    public class Program
    {
        public static void Main(string[] args)
        {
          BuildWebHost(args).Run();
        }

        public static IWebHost BuildWebHost(string[] args) {
          return WebHost.CreateDefaultBuilder(args).UseStartup<Startup>().Build();
        }
    }
}
