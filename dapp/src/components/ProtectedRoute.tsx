import * as React from 'react';
import { Component } from 'react';
import {Route,Redirect} from 'react-router-dom'

interface Gaurd {
  condition: () => boolean,
  redirect: string,
}

interface Props {
  component: any,
  gaurds: Gaurd[],
  exact?:boolean,
  path: string,
}

class ProtectedRoute extends Component<Props> {
  constructor(props: Props) {
    super(props);
    this.checkConditions = this.checkConditions.bind(this);
  }

  render() {
    const {component: WrappedComponent, ...rest} = this.props;
    return (
      <Route {...rest} render={ props => {
        var redirect = this.checkConditions()
        if(redirect) {
          return <Redirect to={{pathname: redirect,state: { from: props.location }}}/>;
        }
        return <WrappedComponent {...props}/>
      }}/>
    );
  }

  checkConditions(){
    const {gaurds} = this.props;

    for(var i = 0; i < gaurds.length; i++){
      if(!gaurds[i].condition()) return gaurds[i].redirect;
    }
    return false;
  }
}

export default ProtectedRoute;
