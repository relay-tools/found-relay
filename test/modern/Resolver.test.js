import queryMiddleware from 'farce/lib/queryMiddleware';
import ServerProtocol from 'farce/lib/ServerProtocol';
import createFarceRouter from 'found/lib/createFarceRouter';
import createRender from 'found/lib/createRender';
import makeRouteConfig from 'found/lib/makeRouteConfig';
import Route from 'found/lib/Route';
import React from 'react';
import ReactTestUtils from 'react-dom/test-utils';
import ReadyStateRenderer from '../../src/modern/ReadyStateRenderer';
import { createFragmentContainer, graphql } from 'react-relay';

import { createEnvironment, InstrumentedResolver } from './helpers';

const historyProtocol = new ServerProtocol('/parent/bar?name=baz');
historyProtocol.transition = (location) => {
  const { action } = location;
  const delta = action === 'PUSH' ? 1 : 0;
  return { ...location, delta };
};

describe('Resolver', () => {
  let environment;

  beforeEach(() => {
    environment = createEnvironment();
  });

  describe('kitchen sink', () => {
    function Root({ children }) {
      return React.cloneElement(children, { extraProp: 3 });
    }

    class WidgetParent extends React.Component {
      componentWillUpdate() {
        this.previousChildren = this.props.children;
      }

      previousChildren = null;

      render() {
        const { widget, children, location } = this.props;
        const { state: locationState } = location;

        const usePreviousChildren =
          locationState &&
          locationState.shouldRenderPreviousChildren;

        return (
          <div className={widget.name}>
            {usePreviousChildren && this.previousChildren}
            {children}
          </div>
        );
      }
    }

    const WidgetParentContainer = createFragmentContainer(
      WidgetParent,
      graphql`
        fragment Resolver_widget on Widget {
          name
        }
      `,
    );

    function WidgetChildren({ first, second, third, route }) {
      expect(route).toBeTruthy();

      return (
        <div>
          <div className={first.name} />
          <div className={second.name} />
          <div className={third.name} />
        </div>
      );
    }

    const WidgetChildrenContainer = createFragmentContainer(
      WidgetChildren,
      graphql`
        fragment Resolver_first on Widget {
          name
        }

        fragment Resolver_second on Widget {
          name
        }

        fragment Resolver_third on Widget {
          name
        }
      `,
    );

    let prerenderSpy;
    let renderSpy;
    let instance;
    let resolver;

    beforeEach(async () => {
      prerenderSpy = jest.fn();
      renderSpy = jest.fn(({ props }) => (
        props && <WidgetParentContainer {...props} />
      ));

      const routes = makeRouteConfig(
        <Route path="/:parentName" Component={Root}>
          <Route
            Component={WidgetParentContainer}
            getQuery={() => graphql`
              query Resolver_WidgetParent_Query {
                widget {
                  ...Resolver_widget
                }
                extra: widgetByArg(name: "extra") {
                  name
                }
              }
            `}
            prerender={prerenderSpy}
            render={renderSpy}
            prepareVariables={({ parentName, ...params }) => ({
              ...params,
              parentName: `${parentName}-`,
            })}
          >
            <Route
              path="default"
              Component={WidgetChildrenContainer}
              query={graphql`
                query Resolver_WidgetDefault_Query {
                  widget {
                    name
                  }
                }
              `}
            />
            <Route
              path=":pathName"
              Component={WidgetChildrenContainer}
              query={graphql`
                query Resolver_WidgetChildren_Query(
                  $pathName: String!
                  $queryName: String!
                  $parentName: String!
                ) {
                  first: widgetByArg(name: $pathName) {
                    ...Resolver_first
                  }
                  second: widgetByArg(name: $queryName) {
                    ...Resolver_second
                  }
                  third: widgetByArg(name: $parentName) {
                    ...Resolver_third
                  }
                }
              `}
              prepareVariables={(params, { location }) => ({
                ...params,
                queryName: location.query.name,
              })}
            />
          </Route>
        </Route>,
      );

      const Router = createFarceRouter({
        historyProtocol,
        historyMiddlewares: [queryMiddleware],
        routeConfig: routes,

        render: createRender({}),
      });

      resolver = new InstrumentedResolver(environment);
      instance = ReactTestUtils.renderIntoDocument(
        <Router resolver={resolver} />,
      );

      await resolver.done;
    });

    describe('rendered components', () => {
      [
        ['basic use', 'foo'],
        ['path params', 'bar'],
        ['prepared params', 'baz'],
        ['modified parent params', 'parent-'],
      ].forEach(([condition, className]) => {
        it(`should support ${condition}`, () => {
          ReactTestUtils.findRenderedDOMComponentWithClass(
            instance, className,
          );
        });
      });
    });

    describe('render arguments', () => {
      describe('before data are ready', () => {
        let renderArgs;

        beforeEach(() => {
          renderArgs = renderSpy.mock.calls[0][0];
        });

        it('should not have Relay props', () => {
          expect(renderArgs.props).toBeNull();
        });

        it('should have router props', () => {
          expect(renderArgs.match).toBeDefined();
          expect(renderArgs.match.route).toBeDefined();
          expect(renderArgs.Component).toBe(WidgetParentContainer);
        });

        it('should have the correct prerender args', () => {
          const prerenderArgs = prerenderSpy.mock.calls[0][0];

          expect(prerenderArgs.match).toBeDefined();
          expect(prerenderArgs.match.route).toBeDefined();
          expect(prerenderArgs.props).toBeNull();
        });
      });

      describe('after data are ready', () => {
        let renderArgs;

        beforeEach(() => {
          renderArgs = renderSpy.mock.calls[1][0];
        });

        it('should have rendered twice', () => {
          expect(renderSpy.mock.calls.length).toBe(2);
        });

        it('should have Relay props', () => {
          expect(renderArgs.props).toBeDefined();
          expect(renderArgs.props.widget).toBeDefined();
        });

        it('should have router props', () => {
          expect(renderArgs.props.route).toBeDefined();
          expect(renderArgs.match).toBeDefined();
          expect(renderArgs.match.route).toBeDefined();
          expect(renderArgs.Component).toBe(WidgetParentContainer);
        });

        it('should support injected props', () => {
          expect(renderArgs.props.extraProp).toBe(3);
          expect(renderArgs.ownProps.extraProp).toBe(3);
        });

        it('should have the correct prerender args', () => {
          expect(prerenderSpy.mock.calls.length).toBe(2);
          const prerenderArgs = prerenderSpy.mock.calls[1][0];

          expect(prerenderArgs.match).toBeDefined();
          expect(prerenderArgs.match.route).toBeDefined();
          expect(prerenderArgs.props).toMatchObject({
            extra: {
              name: 'extra',
            },
          });
        });
      });
    });

    describe('query listeners', () => {
      it('should support multiple listeners', async () => {
        // First we match only a single instance
        const parentAndChildRenderers =
          ReactTestUtils.scryRenderedComponentsWithType(
            instance, ReadyStateRenderer,
          );

        const expectedSize = 2;

        expect(parentAndChildRenderers).toHaveLength(expectedSize);
        parentAndChildRenderers.forEach((thisRendererInstance) => {
          expect(
            ReactTestUtils.isCompositeComponentWithType(
              thisRendererInstance,
              ReadyStateRenderer,
            ),
          ).toBe(true);
        });

        // Now we trigger a route change
        const mockRouter = ReactTestUtils.findRenderedComponentWithType(
          instance, WidgetParentContainer,
        ).props.router;
        mockRouter.push({
          pathname: '/parent/default',
          state: { shouldRenderPreviousChildren: true },
        });

        await resolver.done;

        // And check for an extra ReadyStateRenderer
        const parentChildAndCloneRenderers =
          ReactTestUtils.scryRenderedComponentsWithType(
            instance, ReadyStateRenderer,
          );

        expect(parentChildAndCloneRenderers).toHaveLength(expectedSize + 1);
        parentChildAndCloneRenderers.forEach((thisRendererInstance) => {
          expect(
            ReactTestUtils.isCompositeComponentWithType(
              thisRendererInstance,
              ReadyStateRenderer,
            ),
          ).toBe(true);
        });
      });
    });
  });
});
