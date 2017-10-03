import FarceActionTypes from 'farce/lib/ActionTypes';
import ServerProtocol from 'farce/lib/ServerProtocol';
import createFarceRouter from 'found/lib/createFarceRouter';
import createRender from 'found/lib/createRender';
import React from 'react';
import ReactTestUtils from 'react-dom/test-utils';
import { graphql } from 'react-relay';

import { createEnvironment, InstrumentedResolver } from './helpers';

describe('navigation', () => {
  let environment;

  beforeEach(() => {
    environment = createEnvironment();
  });

  it('should support aborting navigation', async () => {
    const Router = createFarceRouter({
      historyProtocol: new ServerProtocol('/foo'),
      routeConfig: [{
        path: '/:name',
        query: graphql`
          query navigation_name_Query($name: String!) {
            widget: widgetByArg(name: $name) {
              name
            }
          }
        `,
        render: ({ props }) => (
          props && <div className={props.widget.name} />
        ),
      }],

      render: createRender({}),
    });

    const resolver = new InstrumentedResolver(environment);
    const instance = ReactTestUtils.renderIntoDocument(
      <Router resolver={resolver} />,
    );

    await resolver.done;

    ReactTestUtils.findRenderedDOMComponentWithClass(instance, 'foo');
    expect(
      ReactTestUtils.scryRenderedDOMComponentsWithClass(instance, 'bar'),
    ).toHaveLength(0);
    expect(
      ReactTestUtils.scryRenderedDOMComponentsWithClass(instance, 'baz'),
    ).toHaveLength(0);

    // TODO: Use MemoryProtocol once we implement it instead of doing this.
    instance.store.dispatch({
      type: FarceActionTypes.UPDATE_LOCATION,
      payload: {
        pathname: '/bar',
      },
    });

    // Immediately trigger another location update to abort the previous one.
    instance.store.dispatch({
      type: FarceActionTypes.UPDATE_LOCATION,
      payload: {
        pathname: '/baz',
      },
    });

    await resolver.done;

    expect(
      ReactTestUtils.scryRenderedDOMComponentsWithClass(instance, 'foo'),
    ).toHaveLength(0);
    expect(
      ReactTestUtils.scryRenderedDOMComponentsWithClass(instance, 'bar'),
    ).toHaveLength(0);
    ReactTestUtils.findRenderedDOMComponentWithClass(instance, 'baz');
  });

  it('should support retaining previous children', async () => {
    class Parent extends React.Component {
      constructor(props, context) {
        super(props, context);

        this.previousChildren = null;
      }

      componentWillReceiveProps(nextProps) {
        if (nextProps.match.location !== this.props.match.location) {
          this.previousChildren = this.props.children;
        }
      }

      render() {
        return (
          <div>
            {this.previousChildren}
            {this.props.children}
          </div>
        );
      }
    }

    function Widget({ widget }) {
      return <div className={widget.name} />;
    }

    const Router = createFarceRouter({
      historyProtocol: new ServerProtocol('/foo'),
      routeConfig: [{
        path: '/',
        Component: Parent,
        children: [
          {
            path: 'foo',
            Component: Widget,
            query: graphql`
              query navigation_foo_Query {
                widget: widgetByArg(name: "foo") {
                  name
                }
              }
            `,
          },
          {
            path: 'bar',
            Component: Widget,
            query: graphql`
              query navigation_bar_Query {
                widget: widgetByArg(name: "bar") {
                  name
                }
              }
            `,
          },
        ],
      }],

      render: createRender({}),
    });

    const resolver = new InstrumentedResolver(environment);
    const instance = ReactTestUtils.renderIntoDocument(
      <Router resolver={resolver} />,
    );

    await resolver.done;

    ReactTestUtils.findRenderedDOMComponentWithClass(instance, 'foo');
    expect(
      ReactTestUtils.scryRenderedDOMComponentsWithClass(instance, 'bar'),
    ).toHaveLength(0);

    // TODO: Use MemoryProtocol once we implement it instead of doing this.
    instance.store.dispatch({
      type: FarceActionTypes.UPDATE_LOCATION,
      payload: {
        pathname: '/bar',
      },
    });

    await resolver.done;

    ReactTestUtils.findRenderedDOMComponentWithClass(instance, 'foo');
    ReactTestUtils.findRenderedDOMComponentWithClass(instance, 'bar');
  });
});
