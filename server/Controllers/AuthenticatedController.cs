using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Primitives;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace bitcentive
{
  public class AuthenticatedController : BaseController
  {
    public string Address { get; set; }
    public override void OnActionExecuting(ActionExecutingContext context)
    {
      StringValues values;
      if(context.HttpContext.Request.Headers.TryGetValue("Authorization", out values))
      {
        var value = values.FirstOrDefault();
        if (value != null)
        {
          var match = new Regex("(?:Bearer|BEARER|bearer) ([a-fA-F0-9-]+)").Match(value);
          if (match.Success)
          {
            var token = match.Groups[1].Value;
            Guid guid;
            if(Guid.TryParse(token, out guid))
            {
              Address = _data.CheckAccessToken(guid);
              if (Address != null)
              {
                return;
              }
            }
          }
        }
      }
      context.Result = new UnauthorizedResult();
    }
  }
}
