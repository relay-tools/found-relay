import PropTypes from 'prop-types';
import elementType from 'prop-types-extra/lib/elementType';
import React from 'react';
import ReactRelayContext from 'react-relay/lib/ReactRelayContext';
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

class ReadyStateRenderer extends React.Component {
  constructor(props) {
    super(props);

    const { element, querySubscription } = props;

    this.state = {
      element,
    };

    this.selectionReference = querySubscription.retain();

    this.relayContext = {};
    this.updateRelayContext(querySubscription);
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

      this.updateRelayContext(querySubscription);
    }
  }

  componentWillUnmount() {
    this.selectionReference.dispose();
    this.props.querySubscription.unsubscribe(this.onUpdate);
  }

  onUpdate = readyState => {
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

  updateRelayContext(querySubscription) {
    // XXX: Relay v1.6.0 adds an assumption that context.relay is mutated
    // in-place, so we need to do that here.
    Object.assign(this.relayContext, querySubscription.relayContext);
  }

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
      Object.keys(relayProps).forEach(relayPropName => {
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

    return (
      <ReactRelayContext.Provider value={this.relayContext}>
        {React.cloneElement(element, ownProps)}
      </ReactRelayContext.Provider>
    );
  }
}

ReadyStateRenderer.propTypes = propTypes;

export default ReadyStateRenderer;
