import PropTypes from 'prop-types';
import React from 'react';
import { ReactRelayContext } from 'react-relay';
import warning from 'warning';

import QuerySubscription from './QuerySubscription';
import renderElement from './renderElement';

const { hasOwnProperty } = Object.prototype;

const propTypes = {
  match: PropTypes.shape({
    route: PropTypes.object.isRequired,
  }).isRequired,
  Component: PropTypes.elementType,
  isComponentResolved: PropTypes.bool.isRequired,
  hasComponent: PropTypes.bool.isRequired,
  element: PropTypes.element,
  routeChildren: PropTypes.any,
  querySubscription: PropTypes.instanceOf(QuerySubscription).isRequired,
  fetched: PropTypes.bool.isRequired,
};

class ReadyStateRenderer extends React.Component {
  constructor(props) {
    super(props);

    const { element, querySubscription } = props;

    this.state = {
      isInitialRender: true,
      element,
      propsElement: element,
      querySubscription,
      selectionReference: querySubscription.retain(),
      onUpdate: this.onUpdate,
    };
  }

  componentDidMount() {
    this.props.querySubscription.subscribe(this.onUpdate);
  }

  static getDerivedStateFromProps({ element, querySubscription }, state) {
    if (state.isInitialRender) {
      return { isInitialRender: false };
    }

    let nextState = null;

    if (element !== state.propsElement) {
      nextState = {
        element,
        propsElement: element,
      };
    }

    if (querySubscription !== state.querySubscription) {
      state.selectionReference.dispose();
      state.querySubscription.unsubscribe(state.onUpdate);

      nextState = nextState || {};
      nextState.querySubscription = querySubscription;
      nextState.selectionReference = querySubscription.retain();

      querySubscription.subscribe(state.onUpdate);
    }

    return nextState;
  }

  componentWillUnmount() {
    this.state.selectionReference.dispose();
    this.props.querySubscription.unsubscribe(this.onUpdate);
  }

  onUpdate = () => {
    if (!this.props.fetched) {
      // Ignore subscription updates if our data aren't yet fetched. We'll
      // rerender anyway once fetching finishes.
      return;
    }

    const {
      match,
      Component,
      isComponentResolved,
      hasComponent,
      querySubscription,
    } = this.props;

    const element = renderElement({
      match,
      Component,
      isComponentResolved,
      hasComponent,
      querySubscription,
      resolving: false,
    });

    this.setState({ element: element || null });
  };

  render() {
    const { element } = this.state;
    if (!element) {
      return element;
    }

    const { querySubscription, routeChildren, ...ownProps } = this.props;

    delete ownProps.match;
    delete ownProps.Component;
    delete ownProps.isComponentResolved;
    delete ownProps.hasComponent;
    delete ownProps.element;
    delete ownProps.fetched;

    const { props: relayProps } = querySubscription.readyState;

    if (relayProps) {
      Object.keys(relayProps).forEach(relayPropName => {
        // At least on Node v8.x, it's slightly faster to guard the delete here
        // with this hasOwnProperty check.
        if (hasOwnProperty.call(ownProps, relayPropName)) {
          warning(
            false,
            'Ignoring <ReadyStateRenderer> prop `%s` that shadows a Relay prop from its query `%s`. This is most likely due to its parent cloning it and adding extraneous Relay props.',
            relayPropName,
            querySubscription.getQueryName(),
          );

          delete ownProps[relayPropName];
        }
      });
    }

    const child =
      typeof element === 'function'
        ? React.cloneElement(element(routeChildren), ownProps)
        : React.cloneElement(element, {
            ...ownProps,
            ...(React.isValidElement(routeChildren)
              ? { children: routeChildren }
              : routeChildren),
          });

    return (
      <ReactRelayContext.Provider value={querySubscription.relayContext}>
        {child}
      </ReactRelayContext.Provider>
    );
  }
}

ReadyStateRenderer.propTypes = propTypes;

export default ReadyStateRenderer;
