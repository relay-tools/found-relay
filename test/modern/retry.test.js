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

  it('should send a new network requests and rerender', async () => {
    const renderSpy = jest.fn(({ props }) => (
      props && <div className={props.widget.name} />
    ));

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
    const instance = ReactTestUtils.renderIntoDocument(
      <Router resolver={resolver} />,
    );

    await resolver.done;

    expect(fetchSpy.mock.calls).toHaveLength(1);
    ReactTestUtils.findRenderedDOMComponentWithClass(instance, 'foo');

    expect(renderSpy.mock.calls).toHaveLength(2);
    expect(renderSpy.mock.calls[1][0].resolving).toBe(true);

    const retryPromise = new Promise((resolve) => {
      fetchSpy.mockImplementationOnce(async () => {
        // Wait until request resolves to make assertions below.
        setTimeout(resolve, 20);

        return {
          data: {
            widget: {
              name: 'bar',
            },
          },
        };
      });
    });

    renderSpy.mock.calls[1][0].retry();
    await retryPromise;

    expect(fetchSpy.mock.calls).toHaveLength(2);
    ReactTestUtils.findRenderedDOMComponentWithClass(instance, 'bar');

    expect(renderSpy.mock.calls).toHaveLength(3);
    expect(renderSpy.mock.calls[2][0].resolving).toBe(false);
  });
});
