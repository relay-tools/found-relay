import { getFarceResult } from 'found/server';
import { graphql } from 'react-relay';

import { Resolver } from '../src';
import { createEnvironment, createFakeFetch } from './helpers';

describe('refetch behavior', () => {
  let fetchSpy;
  let environment;

  beforeEach(() => {
    fetchSpy = jest.fn(createFakeFetch());
    environment = createEnvironment(fetchSpy);
  });

  it('should support redirecting based on query data', async () => {
    const routeConfig = [
      {
        path: '/',
        query: graphql`
          query refetchTest_parent_Query {
            widget {
              name
            }
          }
        `,
        render: () => null,

        children: [
          {
            path: ':name',
            query: graphql`
              query refetchTest_child_Query($name: String!) {
                widgetByArg(name: $name) {
                  name
                }
              }
            `,
            render: () => null,
          },
        ],
      },
    ];

    const resolver = new Resolver(environment);

    expect(fetchSpy.mock.calls).toHaveLength(0);

    await getFarceResult({ url: '/foo', routeConfig, resolver });
    expect(fetchSpy.mock.calls).toHaveLength(2);

    await getFarceResult({ url: '/bar', routeConfig, resolver });
    expect(fetchSpy.mock.calls).toHaveLength(3);
  });
});
