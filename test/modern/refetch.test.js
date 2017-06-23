import createRender from 'found/lib/createRender';
import getFarceResult from 'found/lib/server/getFarceResult';
import { graphql } from 'react-relay';

import { Resolver } from '../../src';

import { createEnvironment, createFakeFetch } from './helpers';

describe('refetch behavior', () => {
  let fetchSpy;
  let environment;

  beforeEach(() => {
    fetchSpy = jest.fn(createFakeFetch());
    environment = createEnvironment(fetchSpy);
  });

  it('should support redirecting based on query data', async () => {
    const routeConfig = [{
      path: '/',
      query: graphql`
        query refetch_parent_Query {
          widget {
            name
          }
        }
      `,
      render: () => null,

      children: [{
        path: ':name',
        query: graphql`
          query refetch_child_Query($name: String!) {
            widgetByArg(name: $name) {
              name
            }
          }
        `,
        render: () => null,
      }],
    }];

    const resolver = new Resolver(environment);
    const render = createRender({});

    expect(fetchSpy.mock.calls.length).toBe(0);

    await getFarceResult({ url: '/foo', routeConfig, resolver, render });
    expect(fetchSpy.mock.calls.length).toBe(2);

    await getFarceResult({ url: '/bar', routeConfig, resolver, render });
    expect(fetchSpy.mock.calls.length).toBe(3);
  });
});
