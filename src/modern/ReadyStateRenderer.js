import PropTypes from 'prop-types';
import elementType from 'prop-types-extra/lib/elementType';
import React from 'react';
import RelayPropTypes from 'react-relay/lib/RelayPropTypes';

import QuerySubscription from './QuerySubscription';
import renderElement from './renderElement';

const propTypes = {
  match: PropTypes.shape({
    route: PropTypes.shape({
      render: PropTypes.func,
    }).isRequired,
  }).isRequired,
  Component: elementType,
  hasComponent: PropTypes.bool.isRequired,
  element: PropTypes.element,
  querySubscription: PropTypes.instanceOf(QuerySubscription).isRequired,
};

const childContextTypes = {
  relay: RelayPropTypes.Relay,
};

class ReadyStateRenderer extends React.Component {
  constructor(props, context) {
    super(props, context);

    const { element, querySubscription } = props;

    this.state = {
      element,
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
    const { element, querySubscription } = nextProps;

    if (element !== this.props.element) {
      this.setState({ element });
    }

    if (querySubscription !== this.props.querySubscription) {
      this.selectionReference.dispose();
      this.selectionReference = querySubscription.retain();

      this.props.querySubscription.unsubscribe(this.onUpdate);
      querySubscription.subscribe(this.onUpdate);
    }
  }

  componentWillUnmount() {
    this.selectionReference.dispose();
    this.props.querySubscription.unsubscribe(this.onUpdate);
  }

  onUpdate = (readyState) => {
    const { match, Component, hasComponent } = this.props;

    this.setState({
      element: renderElement({
        match,
        Component,
        hasComponent,
        readyState,
        resolving: false,
      }),
    });
  };

  render() {
    const { ...ownProps } = this.props;

    delete ownProps.match;
    delete ownProps.Component;
    delete ownProps.hasComponent;
    delete ownProps.element;
    delete ownProps.querySubscription;

    const { element } = this.state;

    return element && React.cloneElement(element, ownProps);
  }
}

ReadyStateRenderer.propTypes = propTypes;
ReadyStateRenderer.childContextTypes = childContextTypes;

export default ReadyStateRenderer;
