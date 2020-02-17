import FarceActions from 'farce/lib/Actions';
import MemoryProtocol from 'farce/lib/MemoryProtocol';
import createFarceRouter from 'found/lib/createFarceRouter';
import React from 'react';
import ReactTestUtils from 'react-dom/test-utils';
import { graphql } from 'react-relay';

import { InstrumentedResolver, createEnvironment } from './helpers';

describe('navigation', () => {
  let environment;

  beforeEach(() => {
    environment = createEnvironment();
  });

  it('should support aborting navigation', async () => {
    const Router = createFarceRouter({
      historyProtocol: new MemoryProtocol('/foo'),
      routeConfig: [
        {
          path: '/:name',
          query: graphql`
            query navigationTest_name_Query($name: String!) {
              widget: widgetByArg(name: $name) {
                name
              }
            }
          `,
          render: ({ props }) =>
            props && <div className={props.widget.name} />,
        },
      ],
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

    instance.store.dispatch(FarceActions.push('/bar'));

    // Immediately trigger another location update to abort the previous one.
    instance.store.dispatch(FarceActions.push('/baz'));

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
      constructor(props) {
        super(props);

        this.initialChildren = props.children;
      }

      render() {
        const { children } = this.props;

        return (
          <div>
            {this.initialChildren !== children ? this.initialChildren : null}
            {children}
          </div>
        );
      }
    }

    function Widget({ widget }) {
      return <div className={widget.name} />;
    }

    const Router = createFarceRouter({
      historyProtocol: new MemoryProtocol('/foo'),
      routeConfig: [
        {
          path: '/',
          Component: Parent,
          children: [
            {
              path: 'foo',
              Component: Widget,
              query: graphql`
                query navigationTest_foo_Query {
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
                query navigationTest_bar_Query {
                  widget: widgetByArg(name: "bar") {
                    name
                  }
                }
              `,
            },
          ],
        },
      ],
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

    instance.store.dispatch(FarceActions.push('/bar'));

    await resolver.done;

    ReactTestUtils.findRenderedDOMComponentWithClass(instance, 'foo');
    ReactTestUtils.findRenderedDOMComponentWithClass(instance, 'bar');
  });
});
