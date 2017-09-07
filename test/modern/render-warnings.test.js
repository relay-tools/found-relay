jest.mock('warning');

import createRender from 'found/lib/createRender';
import getFarceResult from 'found/lib/server/getFarceResult';
import React from 'react';
import { graphql } from 'react-relay';
import warning from 'warning';

import { Resolver } from '../../src';

import { createEnvironment } from './helpers';

describe('render', () => {
  let environment;

  beforeEach(() => {
    environment = createEnvironment();
  });

  it('should warn on missing component', async () => {
    await getFarceResult({
      url: '/',
      routeConfig: [{
        path: '/',
        query: graphql`
          query render_warnings_Query {
            widget {
              name
            }
          }
        `,
      }],
      resolver: new Resolver(environment),
      render: createRender({}),
    });

    expect(warning).toHaveBeenCalledWith(
      false,
      'Route with query %s has no render method or component.',
      'render_warnings_Query',
    );
  });
});
