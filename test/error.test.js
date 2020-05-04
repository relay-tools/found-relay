import ServerProtocol from 'farce/ServerProtocol';
import createFarceRouter from 'found/createFarceRouter';
import React from 'react';
import ReactTestUtils from 'react-dom/test-utils';
import { graphql } from 'react-relay';

import { InstrumentedResolver, createEnvironment } from './helpers';

describe('error', () => {
  let environment;

  beforeEach(() => {
    environment = createEnvironment();
  });

  it('should pass error to render methods', async () => {
    const render = jest
      .fn()
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
      routeConfig: [
        {
          path: '/',
          query: graphql`
            query error_Query {
              error
            }
          `,
          render,
        },
      ],
    });

    const resolver = new InstrumentedResolver(environment);
    ReactTestUtils.renderIntoDocument(<Router resolver={resolver} />);

    await resolver.done;

    expect(render.mock.calls).toHaveLength(2);
  });
});
