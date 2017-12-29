jest.mock('warning');

import createRender from 'found/lib/createRender';
import getFarceResult from 'found/lib/server/getFarceResult';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { graphql } from 'react-relay';
import warning from 'warning';

import { Resolver } from '../../src';

import { createEnvironment } from './helpers';

describe('render', () => {
  let environment;

  beforeEach(() => {
    environment = createEnvironment();
  });

  it('should warn on missing component', async () => {
    await getFarceResult({
      url: '/',
      routeConfig: [
        {
          path: '/',
          query: graphql`
            query renderWarnings_Query {
              widget {
                name
              }
            }
          `,
        },
      ],
      resolver: new Resolver(environment),
      render: createRender({}),
    });

    expect(warning).toHaveBeenCalledWith(
      false,
      'Route with query `%s` has no render method or component.',
      'renderWarnings_Query',
    );
  });

  it('should warn on missing component with dynamic query', async () => {
    await getFarceResult({
      url: '/',
      routeConfig: [
        {
          path: '/',
          getQuery: () => graphql`
            query renderWarnings_Query {
              widget {
                name
              }
            }
          `,
        },
      ],
      resolver: new Resolver(environment),
      render: createRender({}),
    });

    expect(warning).toHaveBeenCalledWith(
      false,
      'Route with query `%s` has no render method or component.',
      'UNKNOWN',
    );
  });

  it('should warn on shadowing Relay props', async () => {
    function Parent({ children }) {
      return React.cloneElement(children, { widget: null });
    }

    function Widget({ widget }) {
      return widget.name;
    }

    const { element } = await getFarceResult({
      url: '/',
      routeConfig: [
        {
          path: '/',
          Component: Parent,
          children: [
            {
              Component: Widget,
              query: graphql`
                query renderWarnings_Query {
                  widget {
                    name
                  }
                }
              `,
            },
          ],
        },
      ],
      resolver: new Resolver(environment),
      render: createRender({}),
    });

    const name = ReactDOMServer.renderToStaticMarkup(element);

    expect(warning).toHaveBeenCalledWith(
      false,
      expect.stringContaining(
        'prop `%s` that shadows a Relay prop from its query `%s`',
      ),
      'widget',
      'renderWarnings_Query',
    );

    expect(name).toEqual('foo');
  });

  it('should warn on shadowing Relay props from dynamic query', async () => {
    function Parent({ children }) {
      return React.cloneElement(children, { widget: null });
    }

    function Widget({ widget }) {
      return widget.name;
    }

    const { element } = await getFarceResult({
      url: '/',
      routeConfig: [
        {
          path: '/',
          Component: Parent,
          children: [
            {
              Component: Widget,
              getQuery: () => graphql`
                query renderWarnings_Query {
                  widget {
                    name
                  }
                }
              `,
            },
          ],
        },
      ],
      resolver: new Resolver(environment),
      render: createRender({}),
    });

    const name = ReactDOMServer.renderToStaticMarkup(element);

    expect(warning).toHaveBeenCalledWith(
      false,
      expect.stringContaining(
        'prop `%s` that shadows a Relay prop from its query `%s`',
      ),
      'widget',
      'UNKNOWN',
    );

    expect(name).toEqual('foo');
  });
});
