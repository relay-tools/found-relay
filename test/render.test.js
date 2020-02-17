import ServerProtocol from 'farce/lib/ServerProtocol';
import HttpError from 'found/lib/HttpError';
import RedirectException from 'found/lib/RedirectException';
import createFarceRouter from 'found/lib/createFarceRouter';
import getFarceResult from 'found/lib/server/getFarceResult';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import ReactTestUtils from 'react-dom/test-utils';
import { graphql } from 'react-relay';

import { Resolver } from '../src';
import { InstrumentedResolver, createEnvironment, timeout } from './helpers';

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
      routeConfig: [
        {
          path: '/',
          Component: Parent,
          query: graphql`
            query renderTest_named_child_routes_root_Query {
              widget: widgetByArg(name: "root") {
                name
              }
            }
          `,
          children: [
            {
              path: 'foo',
              children: {
                nav: [
                  {
                    path: '(.*)?',
                    Component: Widget,
                    query: graphql`
                      query renderTest_named_child_routes_foo_nav_Query {
                        widget: widgetByArg(name: "foo-nav") {
                          name
                        }
                      }
                    `,
                  },
                ],
                main: [
                  {
                    Component: Widget,
                    query: graphql`
                      query renderTest_named_child_routes_foo_main_Query {
                        widget: widgetByArg(name: "foo-main") {
                          name
                        }
                      }
                    `,
                  },
                ],
              },
            },
          ],
        },
      ],

      renderPending: () => <div className="pending" />,
    });

    const resolver = new InstrumentedResolver(environment);
    const instance = ReactTestUtils.renderIntoDocument(
      <Router resolver={resolver} />,
    );

    // Initial pending render is asynchronous.
    await timeout(10);

    ReactTestUtils.findRenderedDOMComponentWithClass(instance, 'pending');

    await resolver.done;

    ReactTestUtils.findRenderedDOMComponentWithClass(instance, 'root');
    ReactTestUtils.findRenderedDOMComponentWithClass(instance, 'foo-nav');
    ReactTestUtils.findRenderedDOMComponentWithClass(instance, 'foo-main');
  });

  it('should support erroring based on query data', async () => {
    const { status, element } = await getFarceResult({
      url: '/',
      routeConfig: [
        {
          path: '/',
          query: graphql`
            query renderTest_error_Query {
              widget {
                name
              }
            }
          `,
          render: ({ resolving, props }) => {
            if (resolving && props) {
              throw new HttpError(400, props);
            }

            return null;
          },
        },
      ],
      resolver: new Resolver(environment),

      renderError: ({ error }) => (
        <div className={`error-${error.data.widget.name}`} />
      ),
    });

    expect(status).toBe(400);

    expect(ReactDOMServer.renderToString(element)).toMatchInlineSnapshot(
      `"<div class=\\"error-foo\\"></div>"`,
    );
  });

  it('should support redirecting based on query data', async () => {
    const { redirect } = await getFarceResult({
      url: '/',
      routeConfig: [
        {
          path: '/',
          query: graphql`
            query renderTest_redirect_Query {
              widget {
                name
              }
            }
          `,
          render: ({ resolving, props }) => {
            if (resolving && props) {
              throw new RedirectException(`/${props.widget.name}`);
            }

            return null;
          },
        },
      ],
      resolver: new Resolver(environment),
    });

    expect(redirect).toEqual({
      url: '/foo',
    });
  });
});
