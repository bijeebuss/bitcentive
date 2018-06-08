import web3 from './Web3';

class BitCentiveService {

  public static tokenKey = 'access-token';

  get accessToken(): string {
    return sessionStorage.getItem(BitCentiveService.tokenKey);
  }

  set accessToken(token: string) {
    sessionStorage.setItem(BitCentiveService.tokenKey, token);
  }

  url = "http://localhost:5000/api/";

  isLoggedIn(){
    return !!this.accessToken
  }

  callEndPoint(endpoint: string, method: string, body?: any): Promise<Response> {
    var options = {
      method:method,
      headers: {
        'Content-Type':'application/json',
        'Authorization': 'Bearer ' + this.accessToken
      },
      body
    }
    return fetch(this.url + endpoint, options);
  }

  async callApi(endpoint: string, method: string, body?: any): Promise<any>{

    let response = await this.callEndPoint(endpoint, method, body);
    if(response.status === 401) {
      await this.login();
      response = await this.callEndPoint(endpoint, method, body);
    }

    if(response.status !== 200) {
      throw response.json ? await response.json() : response;
    }

    return response.json();
  }

  generateAccessToken(){
    return this.callApi("accessToken/create/" + web3.accounts[0],'POST')
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

  logout(){
    sessionStorage.clear();
  }

  getCampaigns(): Promise<any[]> {
    return this.callApi('campaign', 'GET');
  }

}

export default new BitCentiveService();
