import * as React from 'react';
import { Component } from 'react';
import { Switch, Route, HashRouter } from 'react-router-dom'
import './App.css';
import Item from './components/Item';
import web3 from './util/Web3';
import api from './util/Api';
import ErrorBoundary from './components/ErrorBoundary';
import NavBar from './components/NavBar';
import ProtectedRoute from './components/ProtectedRoute';
import MetaMask from './components/MetaMask';
import Login from './components/Login';
import Campaigns from './components/Campaigns';


interface Props {
  hasError: boolean,
  error?: any
}

const gaurds = {
  metamask : {condition: () => web3.isLoggedIn(), redirect: '/metamask'},
  loggedIn : {condition: () => api.isLoggedIn(), redirect: '/login'}
}

class App extends Component<Props> {

  render() {
    return (
      <HashRouter>
      <ErrorBoundary hasError={this.props.hasError} error={this.props.error}>
      <div>
      <Route render={props => <NavBar {...props} />} />
      <div className="App container" id="app-container">
        <Switch>
          <ProtectedRoute exact path='/' component={Campaigns} gaurds={[gaurds.metamask, gaurds.loggedIn]}/>
          <Route path='/metamask' render={props => <MetaMask condition={gaurds.metamask.condition} {...props}/>}/>
          <ProtectedRoute path='/login' component={Login} gaurds={[gaurds.metamask]}/>
        </Switch>
      </div>
      </div>
      </ErrorBoundary>
      </HashRouter>
    );
  }
}

export default App;
