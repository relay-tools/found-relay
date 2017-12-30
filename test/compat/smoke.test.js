import createRender from 'found/lib/createRender';
import getFarceResult from 'found/lib/server/getFarceResult';
import ReactTestUtils from 'react-dom/test-utils';
import Relay from 'react-relay/classic';
import { graphql } from 'react-relay/compat';

import { Resolver as ModernResolver } from '../../src';
import { Resolver as ClassicResolver } from '../../src/classic';

import { createEnvironment as createClassicEnvironment } from '../classic/helpers';
import { createEnvironment as createModernEnvironment } from '../modern/helpers';

describe('smoke', () => {
  it('should work with modern resolver', async () => {
    const { element } = await getFarceResult({
      url: '/',
      routeConfig: [
        {
          path: '/',
          Component: () => null,
          query: graphql`
            query smoke_Query {
              widget {
                name
              }
            }
          `,
        },
      ],
      resolver: new ModernResolver(createModernEnvironment()),
      render: createRender({}),
    });

    ReactTestUtils.renderIntoDocument(element);
  });

  it('should work with classic resolver', async () => {
    const Container = Relay.createContainer(() => null, {
      fragments: {
        widget: () => Relay.QL`
          fragment on Widget {
            name
          }
        `,
      },
    });

    const { element } = await getFarceResult({
      url: '/',
      routeConfig: [
        {
          path: '/',
          Component: Container,
          queries: {
            widget: () => Relay.QL`query { widget }`,
          },
        },
      ],
      resolver: new ClassicResolver(createClassicEnvironment()),
      render: createRender({}),
    });

    ReactTestUtils.renderIntoDocument(element);
  });
});
