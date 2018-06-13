import * as React from "react";
import { Component } from "react";
import api from '../util/Api';
import web3 from '../util/Web3';
import { Campaign } from '../../../truffle/src/models/campaign';

interface Props {

}

interface State {
  campaigns:any[]
}

export default class Campaigns extends Component<Props, State> {

  constructor(props: Props) {
    super(props);

    this.createCampaign();
    this.refreshCampaigns();
  }
  render() {
    return (
      <h1>Campaigns</h1>
    )
  }

  async refreshCampaigns(): Promise<void> {
    const campaigns = await api.getCampaigns();
    this.setState({campaigns});
  }

  async createCampaign():Promise<void> {
    const bitcentive = await web3.getBitCentive();
    const campaign = new Campaign({
      nonce: 0,
      length: 1,
      frequency: 4,
      cooldown: 8,
      charityPercentage: 15,
      trainerPercentage: 0
    })
    await bitcentive.createCampaign(campaign.toString(), '0x0', {value: web3.web3.toWei(1, 'ether')});
  }
}
