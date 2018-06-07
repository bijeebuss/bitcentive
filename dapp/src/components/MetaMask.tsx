import * as React from 'react';
import { Component } from 'react';
import {Redirect} from 'react-router-dom';

import web3 from '../util/Web3';

interface Props {
  location: {
    state: any
  }
  condition: () => boolean
}

interface State {
  redirectToReferrer: boolean
  loading: boolean
}

class MetaMask extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      redirectToReferrer: false,
      loading:false
    }
    setTimeout(() => {
      if(props.condition()) {
        this.setState({redirectToReferrer: true});
      }
    }, 1000)
  }

  render() {
    const { from } = this.props.location.state || { from: { pathname: '/' } }
    const { redirectToReferrer } = this.state

    if (redirectToReferrer) {
      return (
        <Redirect to={from}/>
      )
    }

    return (
      <div>
        <div className="hr-divider">
          <h3 id="metamaskmessage" className="hr-divider-content hr-divider-heading">Please install and log in with metamask</h3>
        </div>
            <a href="https://metamask.io/"><img className="img-responsive center-block" src='../../public/resources/download-metamask-dark.png' alt='loading...'/></a>
        <br/><br/>
      </div>
    );
  }
}

export default MetaMask;
