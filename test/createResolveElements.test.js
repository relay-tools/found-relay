import queryMiddleware from 'farce/lib/queryMiddleware';
import ServerProtocol from 'farce/lib/ServerProtocol';
import createFarceRouter from 'found/lib/createFarceRouter';
import createRender from 'found/lib/createRender';
import makeRouteConfig from 'found/lib/jsx/makeRouteConfig';
import Route from 'found/lib/jsx/Route';
import React from 'react';
import ReactTestUtils from 'react-dom/test-utils';
import Relay from 'react-relay';
import RelayLocalSchema from 'relay-local-schema';

import createResolveElements from '../src/createResolveElements';

import schema from './fixtures/schema';

describe('createResolveElements', () => {
  let environment;

  beforeEach(() => {
    environment = new Relay.Environment();
    environment.injectNetworkLayer(
      new RelayLocalSchema.NetworkLayer({ schema }),
    );
  });

  describe('kitchen sink', () => {
    function Root({ children }) {
      return React.cloneElement(children, { extraProp: 3 });
    }

    function WidgetParent({ widget, children }) {
      return (
        <div className={widget.name}>
          {children}
        </div>
      );
    }

    const WidgetParentContainer = Relay.createContainer(WidgetParent, {
      fragments: {
        widget: () => Relay.QL`
          fragment on Widget {
            name
          }
        `,
      },
    });

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

    const WidgetChildrenContainer = Relay.createContainer(WidgetChildren, {
      fragments: {
        first: () => Relay.QL`
          fragment on Widget {
            name
          }
        `,
        second: () => Relay.QL`
          fragment on Widget {
            name
          }
        `,
        third: () => Relay.QL`
          fragment on Widget {
            name
          }
        `,
      },
    });

    const WidgetChildrenQueries = {
      first: () => Relay.QL`query { widgetByArg(name: $pathName) }`,
      second: () => Relay.QL`query { widgetByArg(name: $queryName) }`,
      third: () => Relay.QL`query { widgetByArg(name: $parentName) }`,
    };

    let prerenderSpy;
    let renderSpy;
    let instance;

    beforeEach((done) => {
      prerenderSpy = jest.fn();
      renderSpy = jest.fn(({ props }) => (
        props && <WidgetParentContainer {...props} />
      ));

      const routes = makeRouteConfig(
        <Route path="/:parentName" Component={Root}>
          <Route
            Component={WidgetParentContainer}
            getQueries={() => ({
              widget: () => Relay.QL`query { widget }`,
            })}
            extraQuery={Relay.QL`
              query {
                widgetByArg(name: "prerender") {
                  name
                }
              }
            `}
            prerender={prerenderSpy}
            render={renderSpy}
            prepareParams={({ parentName, ...params }) => ({
              ...params,
              parentName: `${parentName}-`,
            })}
          >
            <Route
              path=":pathName"
              Component={WidgetChildrenContainer}
              queries={WidgetChildrenQueries}
              prepareParams={(params, { location }) => ({
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

        render: createRender({}),
      });

      const resolveElementsBase = createResolveElements(environment);

      async function* resolveElements(match) {
        yield* resolveElementsBase(match);
        done();
      }

      instance = ReactTestUtils.renderIntoDocument(
        <Router resolveElements={resolveElements} />,
      );
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

        it('should have the correct ready state', () => {
          expect(renderArgs.done).toBeFalsy();
        });

        it('should have router props', () => {
          expect(renderArgs.match).toBeDefined();
          expect(renderArgs.match.route).toBeDefined();
          expect(renderArgs.Component).toBe(WidgetParentContainer);
        });

        it('should have the correct prerender args', () => {
          const prerenderArgs = prerenderSpy.mock.calls[0][0];

          expect(prerenderArgs.done).toBeFalsy();
          expect(prerenderArgs.match).toBeDefined();
          expect(prerenderArgs.match.route).toBeDefined();
          expect(prerenderArgs.props).toBeUndefined();
          expect(prerenderArgs.extraData).toBeNull();
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

        it('should have the correct ready state', () => {
          expect(renderArgs.done).toBeTruthy();
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

          expect(prerenderArgs.done).toBeTruthy();
          expect(prerenderArgs.match).toBeDefined();
          expect(prerenderArgs.match.route).toBeDefined();
          expect(prerenderArgs.props).toBeUndefined();
          expect(prerenderArgs.extraData).toMatchObject({
            widgetByArg: {
              name: 'prerender',
            },
          });
        });
      });
    });
  });
});
