import * as React from 'react';


interface State {
  hasError: boolean
  error?: any
}

interface Props {
  hasError: boolean
  error?: any
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  componentDidCatch(error: any, info: any) {
    // Display fallback UI
    this.setState({ hasError: true, error });
    // You can also log the error to an error reporting service
    //logErrorToMyService(error, info);
  }

  componentWillCatch(error: any, info: any) {
    // Display fallback UI
    this.setState({ hasError: true, error });
    // You can also log the error to an error reporting service
    //logErrorToMyService(error, info);
  }

  error = () => {
    if(this.state.error)
      return this.state.error.message
    else
      return this.props.error.message
  }

  render() {
    if (this.state.hasError || this.props.hasError) {
      // You can render any custom fallback UI
      return <h1>{this.error() || 'Something went wrong :('}</h1>;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
