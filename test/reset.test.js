import ServerProtocol from 'farce/lib/ServerProtocol';
import createFarceRouter from 'found/lib/createFarceRouter';
import createRender from 'found/lib/createRender';
import React from 'react';
import ReactTestUtils from 'react-dom/test-utils';
import { graphql } from 'react-relay';

import {
  createEnvironment,
  createFakeFetch,
  InstrumentedResolver,
} from './helpers';

describe('reset', () => {
  it('should support resetting environment and resolver', async () => {
    const fetchSpy = jest.fn(createFakeFetch());

    const Router = createFarceRouter({
      historyProtocol: new ServerProtocol('/'),
      routeConfig: [
        {
          path: '/',
          query: graphql`
            query reset_Query {
              widget {
                name
              }
            }
          `,
          render: ({ props }) =>
            props && <div className={props.widget.name} />,
        },
      ],

      render: createRender({}),
    });

    class ResettableRouter extends React.Component {
      constructor(props) {
        super(props);

        this.state = {
          resolver: this.createResolver(),
        };
      }

      reset() {
        this.setState({
          resolver: this.createResolver(),
        });
      }

      createResolver() {
        return new InstrumentedResolver(createEnvironment(fetchSpy));
      }

      render() {
        return <Router resolver={this.state.resolver} />;
      }
    }

    const instance = ReactTestUtils.renderIntoDocument(<ResettableRouter />);
    await instance.state.resolver.done;

    ReactTestUtils.findRenderedDOMComponentWithClass(instance, 'foo');

    fetchSpy.mockImplementationOnce(() => ({
      data: {
        widget: {
          name: 'bar',
        },
      },
    }));

    instance.reset();
    await instance.state.resolver.done;

    ReactTestUtils.findRenderedDOMComponentWithClass(instance, 'bar');
  });
});
