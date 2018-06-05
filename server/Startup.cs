﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Hangfire;


namespace bitcentive
{
  public class Startup
  {
    public Startup(IConfiguration configuration)
    {
      Configuration = configuration;
    }

    public IConfiguration Configuration { get; }

    // This method gets called by the runtime. Use this method to add services to the container.
    public void ConfigureServices(IServiceCollection services)
    {
      services.AddMvc();
      services.AddHangfire(config =>
      {
        config.UseSqlServerStorage(ConfigurationExtensions.GetConnectionString(ConfigurationService.Instance.Config, "DefaultConnection"));
      });
    }

    // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
    public void Configure(IApplicationBuilder app, IHostingEnvironment env)
    {
      if (env.IsDevelopment())
      {
        app.UseDeveloperExceptionPage();
      }

      ConfigurationService.Instance = new ConfigurationService(env);

      app.UseMvc();
      app.UseHangfireDashboard();
      app.UseHangfireServer();

      // Start hangfire job
      RecurringJob.AddOrUpdate<BlockService>(b => b.CheckForNewBlocks(), Cron.Minutely);
    }
  }
}
