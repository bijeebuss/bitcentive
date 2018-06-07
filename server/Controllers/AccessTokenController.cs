using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace bitcentive
{
  [Route("api/[controller]/[action]")]
  [EnableCors("AllowAll")]
  public class AccessTokenController : BaseController
  {
    private readonly EthereumService _web3 = EthereumService.Instance;

    [HttpPost("{address}")]
    public IActionResult Create(string address)
    {
      return Ok(new { token = _data.GenerateAccessToken(address) });
    }

    [HttpPost("{token}/{signature}")]
    public IActionResult Validate(Guid token, string signature)
    {
      var message = Encoding.ASCII.GetBytes(token.ToString());
      var prefix = Encoding.ASCII.GetBytes("\u0019Ethereum Signed Message:\n" + message.Length.ToString());
      var fullmessage = prefix.Concat(message).ToArray();
      var hash = new Nethereum.Util.Sha3Keccack().CalculateHash(fullmessage);
      var sigParams = Nethereum.Signer.MessageSigner.ExtractEcdsaSignature(signature);
      var publicKey = Nethereum.Signer.EthECKey.RecoverFromSignature(sigParams, hash);
      var addr = publicKey.GetPublicAddress();

      if (!_data.ValidateAccessToken(token, addr.ToLower()))
        return Unauthorized();

      return Ok(new {success = true });
    }
  }
}
