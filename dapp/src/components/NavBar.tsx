import * as React from 'react';
import {Component} from 'react';
import { Link, NavLinkProps } from 'react-router-dom';

interface Props {
  location: {
    pathname: string
  }
}

class NavBar extends Component<Props, {}> {

  render() {
    return (
      <nav className="iconav">
      <Link className="iconav-brand" to="/">
        <span className="icon icon-network iconav-brand-icon"></span>
      </Link>
      <div className="iconav-slider">
        <ul className="nav nav-pills iconav-nav">
        <li className={this.props.location.pathname === '/tokens' || this.props.location.pathname === '/' ? 'active' : ''}>
            <Link to="/tokens"  title="Tracked Tokens" data-toggle="tooltip" data-placement="right" data-container="body">
              <span className="icon icon-credit"></span>
              <small className="iconav-nav-label visible-xs-block">Tokens</small>
            </Link>
          </li>
          <li className={this.props.location.pathname === '/settings' ? 'active' : ''}>
            <Link to="/settings" id="nav_settings"  title="Settings" data-toggle="tooltip" data-placement="right" data-container="body">
              <span className="icon icon-cog"></span>
              <small className="iconav-nav-label visible-xs-block">Settings</small>
            </Link>
          </li>
          <li className={this.props.location.pathname === '/admins' ? 'active' : ''}>
            <Link to="/admins" id="nav_admins"  title="Authorized Admins" data-toggle="tooltip" data-placement="right" data-container="body">
              <span className="icon icon-creative-commons-attribution"></span>
              <small className="iconav-nav-label visible-xs-block">Admins</small>
            </Link>
          </li>
        </ul>
      </div>
      </nav>

    );
  }
}

export default NavBar;
