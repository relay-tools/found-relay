import PropTypes from 'prop-types';
import elementType from 'prop-types-extra/lib/elementType';
import React from 'react';
import RelayPropTypes from 'react-relay/lib/RelayPropTypes';
import warning from 'warning';

import QuerySubscription from './QuerySubscription';

const propTypes = {
  match: PropTypes.shape({
    route: PropTypes.shape({
      render: PropTypes.func,
    }).isRequired,
  }).isRequired,
  Component: elementType,
  hasComponent: PropTypes.bool.isRequired,
  querySubscription: PropTypes.instanceOf(QuerySubscription).isRequired,
};

const childContextTypes = {
  relay: RelayPropTypes.Relay,
};

class ReadyStateRenderer extends React.Component {
  constructor(props, context) {
    super(props, context);

    const { querySubscription } = props;

    this.state = {
      readyState: querySubscription.readyState,
    };

    this.selectionReference = querySubscription.retain();
  }

  getChildContext() {
    return {
      relay: this.props.querySubscription.relayContext,
    };
  }

  componentDidMount() {
    this.props.querySubscription.subscribe(this.onUpdate);
  }

  componentWillReceiveProps(nextProps) {
    const { querySubscription } = nextProps;
    const { readyState } = querySubscription;

    if (querySubscription !== this.props.querySubscription) {
      this.onUpdate(readyState);

      this.selectionReference.dispose();
      this.selectionReference = querySubscription.retain();

      this.props.querySubscription.unsubscribe(this.onUpdate);
      querySubscription.subscribe(this.onUpdate);
    } else if (readyState !== this.state.readyState) {
      this.onUpdate(readyState);
    }
  }

  componentWillUnmount() {
    this.selectionReference.dispose();
    this.props.querySubscription.unsubscribe(this.onUpdate);
  }

  onUpdate = (readyState) => {
    this.setState({ readyState });
  };

  render() {
    const { match, Component, hasComponent, ...ownProps } = this.props;
    delete ownProps.querySubscription;

    const { route } = match;

    const { readyState } = this.state;
    const { props } = readyState;

    if (!route.render) {
      if (__DEV__ && !hasComponent) {
        let { query } = route;
        if (query.modern) {
          query = query.modern;
        }

        warning(
          false,
          'Route with query %s has no render method or component.',
          typeof query === 'function' ? query().name : 'UNKNOWN',
        );
      }

      if (!Component || !props) {
        return null;
      }

      return <Component {...match} {...ownProps} {...props} />;
    }

    return route.render({
      ...readyState,
      match,
      Component,
      props: props && { ...match, ...ownProps, ...props },
      ownProps,
    });
  }
}

ReadyStateRenderer.propTypes = propTypes;
ReadyStateRenderer.childContextTypes = childContextTypes;

export default ReadyStateRenderer;
