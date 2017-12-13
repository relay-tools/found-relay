jest.mock('warning');

import createRender from 'found/lib/createRender';
import getFarceResult from 'found/lib/server/getFarceResult';
import { graphql } from 'react-relay/compat';
import warning from 'warning';

import { Resolver } from '../../src';

import { createEnvironment } from '../modern/helpers';

describe('smoke', () => {
  it('should warn on missing component', async () => {
    await getFarceResult({
      url: '/',
      routeConfig: [{
        path: '/',
        query: graphql`
          query smokeWarnings_Query {
            widget {
              name
            }
          }
        `,
      }],
      resolver: new Resolver(createEnvironment()),
      render: createRender({}),
    });

    expect(warning).toHaveBeenCalledWith(
      false,
      'Route with query `%s` has no render method or component.',
      'smokeWarnings_Query',
    );
  });

  it('should warn on missing component with dynamic query', async () => {
    await getFarceResult({
      url: '/',
      routeConfig: [{
        path: '/',
        getQuery: () => graphql`
          query smokeWarnings_Query {
            widget {
              name
            }
          }
        `,
      }],
      resolver: new Resolver(createEnvironment()),
      render: createRender({}),
    });

    expect(warning).toHaveBeenCalledWith(
      false,
      'Route with query `%s` has no render method or component.',
      'smokeWarnings_Query',
    );
  });
});
