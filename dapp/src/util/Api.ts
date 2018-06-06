import web3 from './Web3';

class LendingAppService {

  accessToken: string;

  url = "http://localhost:50412/api/";

  isLoggedIn(){
    return !!this.accessToken
  }

  callApi(endpoint: string, method: string, body?: any): Promise<any>{

    var options = {method:method, headers: new Headers(), body }
    options.headers.append('Content-Type','application/json')
    options.headers.append('Authorization', 'Bearer ' + this.accessToken)

    return fetch(this.url + endpoint, options).then(response => {
      if(response.status !== 200) {
        if(response.json)
          throw response.json();
        else
          throw response;
      }
      return response.json();
    })
  }

  generateAccessToken(){
    return this.callApi("accessToken/create",'POST')
    .then(json => {
      this.accessToken = json.token;
      return this.accessToken;
    })
  }

  validateAccessToken(){
    return web3.personalSign(this.accessToken)
    .then(sig => {
      return this.callApi("accessToken/validate/" + this.accessToken + "/" + sig,'POST')
    })
  }

  login(){
    return this.generateAccessToken()
    .then(token => this.validateAccessToken())
  }

}

export default new LendingAppService();
