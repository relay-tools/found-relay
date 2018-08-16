import delay from 'delay';
import ServerProtocol from 'farce/lib/ServerProtocol';
import createFarceRouter from 'found/lib/createFarceRouter';
import createRender from 'found/lib/createRender';
import pDefer from 'p-defer';
import React from 'react';
import ReactTestUtils from 'react-dom/test-utils';
import { graphql } from 'react-relay';

import {
  createEnvironment,
  createSyncEnvironment,
  InstrumentedResolver,
} from './helpers';

describe('retry', () => {
  let fetchSpy;
  let renderSpy;
  let Router;
  let resolver;

  beforeEach(() => {
    fetchSpy = jest.fn();

    renderSpy = jest.fn(({ error, props }) => {
      if (error) {
        return <div className={error.source.errors[0]} />;
      } else if (props) {
        return <div className={props.widget.name} />;
      }
      return <div className="pending" />;
    });

    Router = createFarceRouter({
      historyProtocol: new ServerProtocol('/'),
      routeConfig: [
        {
          path: '/',
          query: graphql`
            query retry_Query {
              widget {
                name
              }
            }
          `,
          render: renderSpy,
        },
      ],

      render: createRender({}),
    });

    resolver = new InstrumentedResolver(createEnvironment(fetchSpy));
  });

  it('should send a new network request and rerender', async () => {
    fetchSpy.mockImplementationOnce(() => ({
      data: {
        widget: {
          name: 'foo',
        },
      },
    }));

    const instance = ReactTestUtils.renderIntoDocument(
      <Router resolver={resolver} />,
    );

    await resolver.done;

    expect(fetchSpy.mock.calls).toHaveLength(1);
    ReactTestUtils.findRenderedDOMComponentWithClass(instance, 'foo');

    expect(renderSpy.mock.calls).toHaveLength(2);
    expect(renderSpy.mock.calls[1][0].resolving).toBe(true);

    const fetchedDeferred = pDefer();

    fetchSpy.mockImplementationOnce(() => {
      fetchedDeferred.resolve();

      return {
        data: {
          widget: {
            name: 'bar',
          },
        },
      };
    });

    renderSpy.mock.calls[1][0].retry();
    await fetchedDeferred.promise;
    await delay(20);

    expect(fetchSpy.mock.calls).toHaveLength(2);
    ReactTestUtils.findRenderedDOMComponentWithClass(instance, 'bar');

    expect(renderSpy.mock.calls).toHaveLength(3);
    expect(renderSpy.mock.calls[2][0].resolving).toBe(false);
  });

  it('should use pending ready state after error', async () => {
    fetchSpy.mockImplementationOnce(() => ({ errors: ['failed'] }));

    const instance = ReactTestUtils.renderIntoDocument(
      <Router resolver={resolver} />,
    );

    await resolver.done;

    expect(fetchSpy.mock.calls).toHaveLength(1);
    ReactTestUtils.findRenderedDOMComponentWithClass(instance, 'failed');

    expect(renderSpy.mock.calls).toHaveLength(2);
    expect(renderSpy.mock.calls[1][0].resolving).toBe(true);

    const retryDeferred = pDefer();

    fetchSpy.mockImplementationOnce(async () => {
      await retryDeferred.promise;

      return {
        data: {
          widget: {
            name: 'foo',
          },
        },
      };
    });

    renderSpy.mock.calls[1][0].retry();
    await delay(20);

    expect(fetchSpy.mock.calls).toHaveLength(2);
    ReactTestUtils.findRenderedDOMComponentWithClass(instance, 'pending');

    expect(renderSpy.mock.calls).toHaveLength(3);
    expect(renderSpy.mock.calls[2][0].resolving).toBe(false);

    retryDeferred.resolve();
    await delay(20);

    expect(fetchSpy.mock.calls).toHaveLength(2);
    ReactTestUtils.findRenderedDOMComponentWithClass(instance, 'foo');

    expect(renderSpy.mock.calls).toHaveLength(4);
    expect(renderSpy.mock.calls[2][0].resolving).toBe(false);
  });

  it('should use synchronous ready state after error', async () => {
    resolver = new InstrumentedResolver(createSyncEnvironment(fetchSpy));

    fetchSpy.mockImplementationOnce(() => ({ errors: ['failed'] }));

    const instance = ReactTestUtils.renderIntoDocument(
      <Router resolver={resolver} />,
    );

    await resolver.done;

    expect(fetchSpy.mock.calls).toHaveLength(1);
    ReactTestUtils.findRenderedDOMComponentWithClass(instance, 'failed');

    expect(renderSpy.mock.calls).toHaveLength(1);
    expect(renderSpy.mock.calls[0][0].resolving).toBe(true);

    fetchSpy.mockImplementationOnce(() => ({
      data: {
        widget: {
          name: 'foo',
        },
      },
    }));

    renderSpy.mock.calls[0][0].retry();
    await delay(20);

    expect(fetchSpy.mock.calls).toHaveLength(2);
    ReactTestUtils.findRenderedDOMComponentWithClass(instance, 'foo');

    expect(renderSpy.mock.calls).toHaveLength(2);
    expect(renderSpy.mock.calls[1][0].resolving).toBe(false);
  });
});
