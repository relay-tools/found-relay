import createRender from 'found/lib/createRender';
import RedirectException from 'found/lib/RedirectException';
import getFarceResult from 'found/lib/server/getFarceResult';
import Relay from 'react-relay';

import Resolver from '../src/Resolver';

import { createEnvironment } from './helpers';

describe('prerender', () => {
  let environment;

  beforeEach(() => {
    environment = createEnvironment();
  });

  it('should support redirecting based on extra data', async () => {
    const { redirect } = await getFarceResult({
      url: '/',
      routeConfig: [{
        path: '/',
        extraQuery: Relay.QL`query { widget { name } }`,
        prerender: ({ done, extraData }) => {
          if (done) {
            throw new RedirectException(`/${extraData.widget.name}`);
          }
        },
      }],
      resolver: new Resolver(environment),
      render: createRender({}),
    });

    expect(redirect).toEqual({
      url: '/foo',
    });
  });
});
