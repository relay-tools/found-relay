import ServerProtocol from 'farce/lib/ServerProtocol';
import createFarceRouter from 'found/lib/createFarceRouter';
import createRender from 'found/lib/createRender';
import React from 'react';
import ReactTestUtils from 'react-dom/test-utils';
import { graphql } from 'react-relay';

import { createEnvironment, InstrumentedResolver } from './helpers';

describe('error', () => {
  let environment;

  beforeEach(() => {
    environment = createEnvironment();
  });

  it('should pass error to render methods', async () => {
    const prerender = jest.fn()
      .mockImplementationOnce(({ error, props }) => {
        expect(error).toBeNull();
        expect(props).toBeNull();
      })
      .mockImplementationOnce(({ error, props }) => {
        expect(error.message).toMatch(/expected error/);
        expect(props).toBeNull();
      });

    const render = jest.fn()
      .mockImplementationOnce(({ error, props }) => {
        expect(error).toBeNull();
        expect(props).toBeNull();
        return null;
      })
      .mockImplementationOnce(({ error, props }) => {
        expect(error.message).toMatch(/expected error/);
        expect(props).toBeNull();
        return null;
      });

    const Router = createFarceRouter({
      historyProtocol: new ServerProtocol('/'),
      routeConfig: [{
        path: '/',
        query: graphql`
          query error_test_Query {
            error
          }
        `,
        prerender,
        render,
      }],

      render: createRender({}),
    });

    const resolver = new InstrumentedResolver(environment);
    ReactTestUtils.renderIntoDocument(
      <Router resolver={resolver} />,
    );

    await resolver.done;

    expect(prerender.mock.calls).toHaveLength(2);
    expect(render.mock.calls).toHaveLength(2);
  });
});
