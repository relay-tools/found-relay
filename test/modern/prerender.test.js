import createRender from 'found/lib/createRender';
import RedirectException from 'found/lib/RedirectException';
import getFarceResult from 'found/lib/server/getFarceResult';
import { graphql } from 'react-relay';

import { Resolver } from '../../src';

import { createEnvironment } from './helpers';

describe('prerender', () => {
  let environment;

  beforeEach(() => {
    environment = createEnvironment();
  });

  it('should support redirecting based on query data', async () => {
    const { redirect } = await getFarceResult({
      url: '/',
      routeConfig: [{
        path: '/',
        query: graphql`
          query prerender_Query {
            widget {
              name
            }
          }
        `,
        prerender: ({ props }) => {
          if (props) {
            throw new RedirectException(`/${props.widget.name}`);
          }
        },
        render: () => null,
      }],
      resolver: new Resolver(environment),
      render: createRender({}),
    });

    expect(redirect).toEqual({
      url: '/foo',
    });
  });
});
