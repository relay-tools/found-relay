jest.mock('warning');

import getFarceResult from 'found/lib/server/getFarceResult';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { graphql } from 'react-relay';
import warning from 'warning';

import { Resolver } from '../src';

import { createEnvironment } from './helpers';

const query = graphql`
  query renderWarningsTest_Query {
    widget {
      name
    }
  }
`;

describe('render warnings', () => {
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
          query,
        },
      ],
      resolver: new Resolver(environment),
    });

    expect(warning).toHaveBeenCalledWith(
      false,
      'Route with query `%s` has no render method or component.',
      'renderWarningsTest_Query',
    );
  });

  it('should warn on missing component with dynamic query', async () => {
    await getFarceResult({
      url: '/',
      routeConfig: [
        {
          path: '/',
          getQuery: () => query,
        },
      ],
      resolver: new Resolver(environment),
    });

    expect(warning).toHaveBeenCalledWith(
      false,
      'Route with query `%s` has no render method or component.',
      'renderWarningsTest_Query',
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
              query,
            },
          ],
        },
      ],
      resolver: new Resolver(environment),
    });

    const name = ReactDOMServer.renderToStaticMarkup(element);

    expect(warning).toHaveBeenCalledWith(
      false,
      expect.stringContaining(
        'prop `%s` that shadows a Relay prop from its query `%s`',
      ),
      'widget',
      'renderWarningsTest_Query',
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
              getQuery: () => query,
            },
          ],
        },
      ],
      resolver: new Resolver(environment),
    });

    const name = ReactDOMServer.renderToStaticMarkup(element);

    expect(warning).toHaveBeenCalledWith(
      false,
      expect.stringContaining(
        'prop `%s` that shadows a Relay prop from its query `%s`',
      ),
      'widget',
      'renderWarningsTest_Query',
    );

    expect(name).toEqual('foo');
  });

  it('should warn on removed dataFrom and getDataFrom', async () => {
    await getFarceResult({
      url: '/',
      routeConfig: [
        {
          path: '/',
          Component: () => <div />,
          query,
          dataFrom: 'STORE_THEN_NETWORK',
          getDataFrom: () => 'STORE_THEN_NETWORK',
        },
      ],
      resolver: new Resolver(environment),
    });

    expect(warning).toHaveBeenCalledWith(
      false,
      '`dataFrom` on routes no longer has any effect; use `fetchPolicy` instead.',
    );
    expect(warning).toHaveBeenCalledWith(
      false,
      '`getDataFrom` on routes no longer has any effect; use `getFetchPolicy` instead.',
    );
  });
});
