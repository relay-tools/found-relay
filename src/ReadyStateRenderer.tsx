/* eslint-disable @typescript-eslint/ban-types */
import type { Match } from 'found';
import React from 'react';
import { ReactRelayContext } from 'react-relay';
import type { Disposable } from 'relay-runtime';

import QuerySubscription from './QuerySubscription';
import renderElement from './renderElement';

const { hasOwnProperty } = Object.prototype;

type RouteElement =
  | React.ReactElement
  | ((routes: React.ReactElement | {}) => React.ReactElement);

interface Props {
  match: Match & { route: Record<string, any> };
  Component: React.ElementType | null;
  isComponentResolved: boolean;
  hasComponent: boolean;
  element: RouteElement;
  routeChildren: React.ReactElement | {};
  querySubscription: QuerySubscription;
  fetched: boolean;

  [other: string]: any;
}

interface State {
  isInitialRender: true;
  element: RouteElement;
  propsElement: RouteElement;
  querySubscription: QuerySubscription;
  selectionReference: Disposable;
  onUpdate: () => void;
}
class ReadyStateRenderer extends React.Component<Props, State> {
  constructor(props: Props) {
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

  static getDerivedStateFromProps(
    { element, querySubscription }: Props,
    state: State,
  ) {
    if (state.isInitialRender) {
      return { isInitialRender: false };
    }

    let nextState: Partial<State> | null = null;

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

    const {
      match: _m,
      Component: _C,
      isComponentResolved: _iCR,
      hasComponent: _hC,
      element: _e,
      routeChildren,
      querySubscription,
      fetched: _f,
      ...ownProps
    } = this.props;

    const { props: relayProps } = querySubscription.readyState;

    if (relayProps) {
      Object.keys(relayProps).forEach((relayPropName) => {
        // At least on Node v8.x, it's slightly faster to guard the delete here
        // with this hasOwnProperty check.
        if (hasOwnProperty.call(ownProps, relayPropName)) {
          if (process.env.NODE_ENV !== 'production') {
            console.error(
              `Ignoring <ReadyStateRenderer> prop \`${relayPropName}\` that shadows a Relay prop from its query \`${querySubscription.getQueryName()}\`. This is most likely due to its parent cloning it and adding extraneous Relay props.`,
            );
          }
          // @ts-ignore
          delete ownProps[relayPropName];
        }
      });
    }

    return (
      <ReactRelayContext.Provider value={querySubscription.relayContext}>
        {typeof element === 'function'
          ? React.cloneElement(element(routeChildren), ownProps)
          : React.cloneElement(element, {
              ...(React.isValidElement(routeChildren)
                ? { children: routeChildren }
                : routeChildren),
              ...ownProps,
            })}
      </ReactRelayContext.Provider>
    );
  }
}

export default ReadyStateRenderer;
