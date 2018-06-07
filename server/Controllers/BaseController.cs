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
  public class ErrorList
  {
    public List<string> errors { get; set; }
  }

  public class BaseController : Controller
  {
    protected readonly DataService _data = DataService.Instance;

    public ErrorList Error(string error)
    {
      return new ErrorList { errors = new List<string> { error } };
    }

    public ErrorList ModelStateErrors => new ErrorList { errors = ModelState.Values.Select(v => v.Errors.ToList()).Aggregate((l1, l2) => l1.Concat(l2).ToList()).Select(e => e.ErrorMessage).ToList() };
  }

}
