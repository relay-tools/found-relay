import { getFarceResult } from 'found/server';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { graphql } from 'react-relay';

import { Resolver } from '../src';
import { createEnvironment } from './helpers';

const query = graphql`
  query renderWarnings_Query {
    widget {
      name
    }
  }
`;

describe('render warnings', () => {
  let environment;
  let warning;

  beforeEach(() => {
    environment = createEnvironment();
    warning = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    warning?.mockRestore();
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
      'Route with query `renderWarnings_Query` has no render method or component.',
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
      'Route with query `renderWarnings_Query` has no render method or component.',
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
      expect.stringContaining(
        'prop `widget` that shadows a Relay prop from its query `renderWarnings_Query`',
      ),
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
      expect.stringContaining(
        'prop `widget` that shadows a Relay prop from its query `renderWarnings_Query`',
      ),
    );

    expect(name).toEqual('foo');
  });
});
