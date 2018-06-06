import api from '../util/Api';
import * as React from 'react';
import { Component } from 'react';
import {Redirect} from 'react-router-dom';

const loadingBars = <img src='../../public/resources/loading-bars.svg' alt='loading...'/>

interface Props {
  location: {
    state: any
  }
}

interface State {
  redirectToReferrer: boolean
  loading: boolean
}

class Login extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      redirectToReferrer: false,
      loading:false
    }
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
        <h1>Please log in with metamask</h1>
        <p>You will be asked to sign your access token</p>
        {
          this.state.loading ?
            loadingBars
          :
            <button className="btn" onClick={this.login}>Log in</button>
        }
      </div>
    )
  }

  login = () => {
    this.setState({loading:true})
    api.login().then(() => {
      this.setState({ redirectToReferrer: true })
    })
  }
}

export default Login;
