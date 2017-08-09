import ServerProtocol from 'farce/lib/ServerProtocol';
import createFarceRouter from 'found/lib/createFarceRouter';
import createRender from 'found/lib/createRender';
import React from 'react';
import ReactTestUtils from 'react-dom/test-utils';
import { graphql } from 'react-relay';

import { createEnvironment, createFakeFetch, InstrumentedResolver }
  from './helpers';

describe('retry', () => {
  let fetchSpy;
  let environment;

  beforeEach(() => {
    fetchSpy = jest.fn(createFakeFetch());
    environment = createEnvironment(fetchSpy);
  });

  it('should fire a new network request', async () => {
    const renderSpy = jest.fn(() => null);

    const Router = createFarceRouter({
      historyProtocol: new ServerProtocol('/'),
      routeConfig: [{
        path: '/',
        query: graphql`
          query retry_Query {
            widget {
              name
            }
          }
        `,
        render: renderSpy,
      }],

      render: createRender({}),
    });

    expect(fetchSpy.mock.calls).toHaveLength(0);

    const resolver = new InstrumentedResolver(environment);
    ReactTestUtils.renderIntoDocument(
      <Router resolver={resolver} />,
    );

    await resolver.done;
    expect(fetchSpy.mock.calls).toHaveLength(1);

    renderSpy.mock.calls[1][0].retry();

    await resolver.done;
    expect(fetchSpy.mock.calls).toHaveLength(2);
  });
});
