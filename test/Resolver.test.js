import ServerProtocol from 'farce/lib/ServerProtocol';
import queryMiddleware from 'farce/lib/queryMiddleware';
import Route from 'found/lib/Route';
import createFarceRouter from 'found/lib/createFarceRouter';
import makeRouteConfig from 'found/lib/makeRouteConfig';
import React from 'react';
import ReactTestUtils from 'react-dom/test-utils';
import { createFragmentContainer, graphql } from 'react-relay';
import { Environment } from 'relay-runtime';

import { InstrumentedResolver, createEnvironment } from './helpers';

describe('Resolver', () => {
  let environment;

  beforeEach(() => {
    environment = createEnvironment();
  });

  describe('kitchen sink', () => {
    function Root({ children }) {
      return React.cloneElement(children, { extraProp: 3 });
    }

    function WidgetParent({ widget, extraProp, children }) {
      expect(extraProp).toBe(3);

      return (
        <div className={`${widget.name} ${widget.argValue}`}>{children}</div>
      );
    }

    const WidgetParentContainer = createFragmentContainer(WidgetParent, {
      widget: graphql`
        fragment ResolverTest_widget on Widget {
          name
          argValue(value: $variable)
        }
      `,
    });

    function WidgetChildren({ first, second, third, match }) {
      expect(match.route).toBeTruthy();

      return (
        <div>
          <div className={first.name} />
          <div className={second.name} />
          <div className={third.name} />
        </div>
      );
    }

    const WidgetChildrenContainer = createFragmentContainer(WidgetChildren, {
      first: graphql`
        fragment ResolverTest_first on Widget {
          name
        }
      `,
      second: graphql`
        fragment ResolverTest_second on Widget {
          name
        }
      `,
      third: graphql`
        fragment ResolverTest_third on Widget {
          name
        }
      `,
    });

    let renderSpy;
    let instance;

    beforeEach(async () => {
      renderSpy = jest.fn(
        ({ Component, props }) => props && <Component {...props} />,
      );

      const routes = makeRouteConfig(
        <Route path="/:parentName" Component={Root}>
          <Route
            getComponent={() => WidgetParentContainer}
            getQuery={() => graphql`
              query ResolverTest_WidgetParent_Query($variable: String!) {
                widget {
                  ...ResolverTest_widget
                }
                extra: widgetByArg(name: "extra") {
                  name
                }
              }
            `}
            prepareVariables={({ parentName, ...params }) => ({
              ...params,
              variable: `${parentName}-variable`,
              parentName: `${parentName}-modified`,
            })}
            render={renderSpy}
          >
            <Route
              path=":pathName"
              Component={WidgetChildrenContainer}
              query={graphql`
                query ResolverTest_WidgetChildren_Query(
                  $pathName: String!
                  $queryName: String!
                  $parentName: String!
                ) {
                  first: widgetByArg(name: $pathName) {
                    ...ResolverTest_first
                  }
                  second: widgetByArg(name: $queryName) {
                    ...ResolverTest_second
                  }
                  third: widgetByArg(name: $parentName) {
                    ...ResolverTest_third
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
        historyProtocol: new ServerProtocol('/parent/bar?name=baz'),
        historyMiddlewares: [queryMiddleware],
        routeConfig: routes,
      });

      const resolver = new InstrumentedResolver(environment);
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
        ['GraphQL variable in fragments', 'parent-variable'],
        ['modified parent params', 'parent-modified'],
      ].forEach(([condition, className]) => {
        it(`should support ${condition}`, () => {
          ReactTestUtils.findRenderedDOMComponentWithClass(
            instance,
            className,
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

        it('should not have Relay data props', () => {
          expect(renderArgs.props).toBeNull();
        });

        it('should have router props', () => {
          expect(renderArgs.match).toBeDefined();
          expect(renderArgs.match.route).toBeDefined();
          expect(renderArgs.Component).toBe(WidgetParentContainer);
        });

        it('should have other Relay props', () => {
          expect(renderArgs.environment).toEqual(expect.any(Environment));
          expect(renderArgs.variables).toEqual({
            parentName: 'parent-modified',
            variable: 'parent-variable',
          });
        });
      });

      describe('after data are ready', () => {
        let renderArgs;

        beforeEach(() => {
          renderArgs = renderSpy.mock.calls[1][0];
        });

        it('should have rendered twice', () => {
          expect(renderSpy.mock.calls).toHaveLength(2);
        });

        it('should have Relay data props', () => {
          expect(renderArgs.props).toBeDefined();
          expect(renderArgs.props.widget).toBeDefined();
          expect(renderArgs.props).toMatchObject({
            extra: {
              name: 'extra',
            },
          });
        });

        it('should have router props', () => {
          expect(renderArgs.props.match).toBeDefined();
          expect(renderArgs.props.match.route).toBeDefined();
          expect(renderArgs.match).toBeDefined();
          expect(renderArgs.match.route).toBeDefined();
          expect(renderArgs.Component).toBe(WidgetParentContainer);
        });

        it('should have other Relay props', () => {
          expect(renderArgs.environment).toEqual(expect.any(Environment));
          expect(renderArgs.variables).toEqual({
            parentName: 'parent-modified',
            variable: 'parent-variable',
          });
        });
      });
    });
  });
});
