import * as React from "react";
import { Component } from "react";
import api from '../util/Api';

interface Props {

}

interface State {
  campaigns:any[]
}

export default class Campaigns extends Component<Props, State> {

  constructor(props: Props) {
    super(props);

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
}
