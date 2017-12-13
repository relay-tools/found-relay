import PropTypes from 'prop-types';
import elementType from 'prop-types-extra/lib/elementType';
import React from 'react';
import RelayPropTypes from 'react-relay/lib/RelayPropTypes';
import warning from 'warning';

import getQueryName from './getQueryName';
import QuerySubscription from './QuerySubscription';
import renderElement from './renderElement';

const { hasOwnProperty } = Object.prototype;

const propTypes = {
  match: PropTypes.shape({
    route: PropTypes.object.isRequired,
  }).isRequired,
  Component: elementType,
  isComponentResolved: PropTypes.bool.isRequired,
  hasComponent: PropTypes.bool.isRequired,
  element: PropTypes.element,
  querySubscription: PropTypes.instanceOf(QuerySubscription).isRequired,
  fetched: PropTypes.bool.isRequired,
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
    if (!this.props.fetched) {
      // Ignore subscription updates if our data aren't yet fetched. We'll
      // rerender anyway once fetching finishes.
      return;
    }

    const { match, Component, isComponentResolved, hasComponent } = this.props;

    const element = renderElement({
      match,
      Component,
      isComponentResolved,
      hasComponent,
      readyState,
      resolving: false,
    });

    this.setState({ element: element || null });
  };

  render() {
    const { element } = this.state;
    if (!element) {
      return element;
    }

    const { querySubscription, ...ownProps } = this.props;

    delete ownProps.match;
    delete ownProps.Component;
    delete ownProps.isComponentResolved;
    delete ownProps.hasComponent;
    delete ownProps.element;
    delete ownProps.fetched;

    const { props: relayProps } = querySubscription.readyState;

    if (relayProps) {
      Object.keys(relayProps).forEach((relayPropName) => {
        // At least on Node v8.x, it's slightly faster to guard the delete here
        // with this hasOwnProperty check.
        if (hasOwnProperty.call(ownProps, relayPropName)) {
          warning(
            false,
            'Ignoring <ReadyStateRenderer> prop `%s` that shadows a Relay ' +
            'prop from its query `%s`. This is most likely due to its ' +
            'parent cloning it and adding extraneous Relay props.',
            relayPropName,
            getQueryName(this.props.match.route),
          );

          delete ownProps[relayPropName];
        }
      });
    }

    return React.cloneElement(element, ownProps);
  }
}

ReadyStateRenderer.propTypes = propTypes;
ReadyStateRenderer.childContextTypes = childContextTypes;

export default ReadyStateRenderer;
