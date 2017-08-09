import ServerProtocol from 'farce/lib/ServerProtocol';
import createFarceRouter from 'found/lib/createFarceRouter';
import createRender from 'found/lib/createRender';
import React from 'react';
import ReactTestUtils from 'react-dom/test-utils';
import { graphql } from 'react-relay';

import { createEnvironment, InstrumentedResolver } from './helpers';

describe('render', () => {
  let environment;

  beforeEach(() => {
    environment = createEnvironment();
  });

  it('should render named child routes', async () => {
    function Parent({ widget, nav, main }) {
      return (
        <div className={widget.name}>
          {nav}
          {main}
        </div>
      );
    }

    function Widget({ widget }) {
      return <div className={widget.name} />;
    }

    const Router = createFarceRouter({
      historyProtocol: new ServerProtocol('/foo'),
      routeConfig: [{
        path: '/',
        Component: Parent,
        query: graphql`
          query render_named_child_routes_root_Query {
            widget: widgetByArg(name: "root") {
              name
            }
          }
        `,
        children: [{
          path: 'foo',
          children: {
            nav: [{
              path: '(.*)?',
              Component: Widget,
              query: graphql`
                query render_named_child_routes_foo_nav_Query {
                  widget: widgetByArg(name: "foo-nav") {
                    name
                  }
                }
              `,
            }],
            main: [{
              Component: Widget,
              query: graphql`
                query render_named_child_routes_foo_main_Query {
                  widget: widgetByArg(name: "foo-main") {
                    name
                  }
                }
              `,
            }],
          },
        }],
      }],

      render: createRender({}),
    });

    const resolver = new InstrumentedResolver(environment);
    const instance = ReactTestUtils.renderIntoDocument(
      <Router resolver={resolver} />,
    );

    await resolver.done;

    ReactTestUtils.findRenderedDOMComponentWithClass(instance, 'root');
    ReactTestUtils.findRenderedDOMComponentWithClass(instance, 'foo-nav');
    ReactTestUtils.findRenderedDOMComponentWithClass(instance, 'foo-main');
  });
});
