import delay from 'delay';
import ServerProtocol from 'farce/lib/ServerProtocol';
import createFarceRouter from 'found/lib/createFarceRouter';
import pDefer from 'p-defer';
import React from 'react';
import ReactTestUtils from 'react-dom/test-utils';
import { graphql } from 'react-relay';

import {
  createEnvironment,
  createSyncEnvironment,
  InstrumentedResolver,
} from './helpers';

const query = graphql`
  query fetchPolicyTest_default_Query {
    widget {
      name
    }
  }
`;

function createRecords() {
  return {
    'client:root': {
      __id: 'client:root',
      __typename: '__Root',
      widget: { __ref: 'client:root:widget' },
    },
    'client:root:widget': {
      __id: 'client:root:widget',
      __typename: 'Widget',
      name: 'bar',
    },
  };
}

describe('fetchPolicy', () => {
  let fetchSpy;
  let renderSpy;

  beforeEach(() => {
    fetchSpy = jest.fn();

    renderSpy = jest.fn(({ props }) => (
      <div className={props ? props.widget.name : 'pending'} />
    ));
  });

  describe('default (network-only)', () => {
    let Router;

    beforeEach(() => {
      Router = createFarceRouter({
        historyProtocol: new ServerProtocol('/'),
        routeConfig: [
          {
            path: '/',
            query,
            render: renderSpy,
          },
        ],
      });
    });

    it('should ignore store data', async () => {
      const fetchDeferred = pDefer();

      fetchSpy.mockImplementationOnce(async () => {
        await fetchDeferred.promise;

        return {
          data: {
            widget: {
              name: 'foo',
            },
          },
        };
      });

      const environment = createEnvironment(fetchSpy, createRecords());
      const resolver = new InstrumentedResolver(environment);

      const instance = ReactTestUtils.renderIntoDocument(
        <Router resolver={resolver} />,
      );

      await delay(20);

      ReactTestUtils.findRenderedDOMComponentWithClass(instance, 'pending');

      fetchDeferred.resolve();
      await resolver.done;

      expect(fetchSpy.mock.calls).toHaveLength(1);
      ReactTestUtils.findRenderedDOMComponentWithClass(instance, 'foo');
    });
  });

  describe('store-and-network', () => {
    let Router;

    beforeEach(() => {
      Router = createFarceRouter({
        historyProtocol: new ServerProtocol('/'),
        routeConfig: [
          {
            path: '/',
            query,
            render: renderSpy,
            fetchPolicy: 'store-and-network',
          },
        ],
      });
    });

    it('should fetch from the network when store has no data', async () => {
      const fetchDeferred = pDefer();

      fetchSpy.mockImplementationOnce(async () => {
        await fetchDeferred.promise;

        return {
          data: {
            widget: {
              name: 'foo',
            },
          },
        };
      });

      const environment = createEnvironment(fetchSpy);
      const resolver = new InstrumentedResolver(environment);

      const instance = ReactTestUtils.renderIntoDocument(
        <Router resolver={resolver} />,
      );

      await delay(20);

      expect(fetchSpy.mock.calls).toHaveLength(1);
      ReactTestUtils.findRenderedDOMComponentWithClass(instance, 'pending');

      fetchDeferred.resolve();
      await resolver.done;

      ReactTestUtils.findRenderedDOMComponentWithClass(instance, 'foo');
    });

    it('should use store data when available', async () => {
      const fetchDeferred = pDefer();

      fetchSpy.mockImplementationOnce(async () => {
        await fetchDeferred.promise;

        return {
          data: {
            widget: {
              name: 'foo',
            },
          },
        };
      });

      const environment = createEnvironment(fetchSpy, createRecords());
      const resolver = new InstrumentedResolver(environment);

      const instance = ReactTestUtils.renderIntoDocument(
        <Router resolver={resolver} />,
      );

      await resolver.done;
      await delay(20);

      expect(fetchSpy.mock.calls).toHaveLength(1);
      ReactTestUtils.findRenderedDOMComponentWithClass(instance, 'bar');

      fetchDeferred.resolve();
      await delay(20);

      ReactTestUtils.findRenderedDOMComponentWithClass(instance, 'foo');
    });

    it('should ignore store data when network is synchronous', async () => {
      fetchSpy.mockImplementationOnce(() => ({
        data: {
          widget: {
            name: 'foo',
          },
        },
      }));

      const environment = createSyncEnvironment(fetchSpy, createRecords());
      const resolver = new InstrumentedResolver(environment);

      const instance = ReactTestUtils.renderIntoDocument(
        <Router resolver={resolver} />,
      );

      await resolver.done;

      expect(fetchSpy.mock.calls).toHaveLength(1);
      ReactTestUtils.findRenderedDOMComponentWithClass(instance, 'foo');
    });
  });

  describe('store-or-network', () => {
    let Router;

    beforeEach(() => {
      Router = createFarceRouter({
        historyProtocol: new ServerProtocol('/'),
        routeConfig: [
          {
            path: '/',
            query,
            render: renderSpy,
            fetchPolicy: 'store-or-network',
          },
        ],
      });
    });

    it('should fetch from the network when store has no data', async () => {
      const fetchDeferred = pDefer();

      fetchSpy.mockImplementationOnce(async () => {
        await fetchDeferred.promise;

        return {
          data: {
            widget: {
              name: 'foo',
            },
          },
        };
      });

      const environment = createEnvironment(fetchSpy);
      const resolver = new InstrumentedResolver(environment);

      const instance = ReactTestUtils.renderIntoDocument(
        <Router resolver={resolver} />,
      );

      await delay(20);

      expect(fetchSpy.mock.calls).toHaveLength(1);
      ReactTestUtils.findRenderedDOMComponentWithClass(instance, 'pending');

      fetchDeferred.resolve();
      await resolver.done;

      ReactTestUtils.findRenderedDOMComponentWithClass(instance, 'foo');
    });

    it('should use store data when available', async () => {
      fetchSpy.mockImplementationOnce(() => ({
        data: {
          widget: {
            name: 'foo',
          },
        },
      }));

      const environment = createEnvironment(fetchSpy, createRecords());
      const resolver = new InstrumentedResolver(environment);

      const instance = ReactTestUtils.renderIntoDocument(
        <Router resolver={resolver} />,
      );

      await resolver.done;
      await delay(20);

      expect(fetchSpy.mock.calls).toHaveLength(0);
      ReactTestUtils.findRenderedDOMComponentWithClass(instance, 'bar');
    });
  });
});
