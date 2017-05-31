import PropTypes from 'prop-types';
import React from 'react';
import Relay from 'react-relay';

const propTypes = {
  match: PropTypes.shape({
    route: PropTypes.shape({
      render: PropTypes.func,
    }).isRequired,
  }).isRequired,
  Component: Relay.PropTypes.Container,
  environment: Relay.PropTypes.Environment,
  queryConfig: Relay.PropTypes.QueryConfig.isRequired,
  readyState: PropTypes.object.isRequired,
  runQueries: PropTypes.func,
};

class RelayRouteRenderer extends React.Component {
  constructor(props, context) {
    super(props, context);

    this.state = {
      readyState: props.readyState,
    };

    // We don't need a separate lastRequest here like in Relay.Renderer because
    // actual updates will give us a new ready state anyway. The below code
    // maintains an invariant that there is only a pending request if
    // runQueries is defined.
    this.pendingRequest = null;
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.runQueries !== this.props.runQueries) {
      if (this.pendingRequest) {
        this.pendingRequest.abort();
        this.pendingRequest = null;
      }
    }

    // It's impossible for readyState to change while a defined runQueries
    // stays the same, so the above check will ensure that any pending request
    // is appropriately aborted.
    if (nextProps.readyState !== this.state.readyState) {
      // Should be safe to do a synchronous state check here, since this isn't
      // in the context of a batched event handler.
      this.setState({ readyState: nextProps.readyState });
    }
  }

  componentWillUnmount() {
    if (this.pendingRequest) {
      this.pendingRequest.abort();
    }
  }

  retry = () => {
    if (this.pendingRequest) {
      this.pendingRequest.abort();
      this.pendingRequest = null;
    }

    const { runQueries } = this.props;
    if (!runQueries) {
      return;
    }

    const request = runQueries((readyState) => {
      if (this.pendingRequest !== request) {
        return;
      }

      if (readyState.aborted || readyState.done || readyState.error) {
        this.pendingRequest = null;
      }

      this.setState({ readyState });
    });

    this.pendingRequest = request;
  };

  render() {
    // We need to explicitly pull out ownProps here to inject them into the
    // actual Relay container rather than the Relay.ReadyStateRenderer, when
    // we get cloned with props like children.
    const {
      match, Component, environment, queryConfig, ...ownProps
    } = this.props;

    delete ownProps.readyState;
    delete ownProps.runQueries;

    const { route } = match;

    // The render function must be bound here to correctly trigger updates in
    // Relay.ReadyStateRenderer.
    function render(renderArgs) {
      const { props } = renderArgs;

      if (!route.render) {
        if (!props) {
          return undefined;
        }

        return <Component {...match} {...ownProps} {...props} />;
      }

      return route.render({
        ...renderArgs,
        match,
        Component,
        props: props && { ...match, ...ownProps, ...props },
        ownProps,
      });
    }

    return (
      <Relay.ReadyStateRenderer
        Container={Component}
        environment={environment}
        queryConfig={queryConfig}
        readyState={this.state.readyState}
        render={render}
        retry={this.retry}
      />
    );
  }
}

RelayRouteRenderer.propTypes = propTypes;

export default RelayRouteRenderer;
