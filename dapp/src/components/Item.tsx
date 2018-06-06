import { Component } from "react";
import * as React from "react";

interface Props {
  text:string
}

interface State {
  checked:boolean
}

export default class Item extends Component<Props, State> {

  render() {
    return (
      <h1>{this.props.text}</h1>
    );
  }
}
