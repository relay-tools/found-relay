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

class SnapshotRenderer extends React.Component {
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
    this.subscribe(this.props.querySubscription);
  }

  componentWillReceiveProps(nextProps) {
    const { querySubscription } = nextProps;
    const { readyState } = querySubscription;

    if (querySubscription !== this.props.querySubscription) {
      this.onUpdate(readyState);

      this.selectionReference.dispose();
      this.selectionReference = querySubscription.retain();

      this.subscribe(querySubscription);
    } else if (readyState !== this.state.readyState) {
      this.onUpdate(readyState);
    }
  }

  componentWillUnmount() {
    this.selectionReference.dispose();
  }

  onUpdate = (readyState) => {
    this.setState({ readyState });
  };

  subscribe(querySubscription) {
    querySubscription.subscribe(this.onUpdate);
  }

  render() {
    const { match, Component, hasComponent, ...ownProps } = this.props;
    delete ownProps.querySubscription;

    const { route } = match;

    const { readyState } = this.state;
    const { props } = readyState;

    if (!route.render) {
      warning(
        hasComponent,
        'Route with query %s has no render method or component.',
        route.query().name,
      );

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

SnapshotRenderer.propTypes = propTypes;
SnapshotRenderer.childContextTypes = childContextTypes;

export default SnapshotRenderer;
