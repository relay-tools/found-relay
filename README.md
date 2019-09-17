# Found Relay [![Travis][build-badge]][build] [![npm][npm-badge]][npm]

[Relay](http://facebook.github.io/relay/) integration for [Found](https://github.com/4Catalyzer/found).

<!-- prettier-ignore-start -->
<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents** _generated with [DocToc](https://github.com/thlorenz/doctoc)_

- [Usage](#usage)
- [Examples](#examples)
- [Guide](#guide)
  - [Installation](#installation)
  - [Router configuration](#router-configuration)
  - [Route configuration](#route-configuration)
    - [`query` or `getQuery`](#query-or-getquery)
    - [`cacheConfig` or `getCacheConfig`](#cacheconfig-or-getcacheconfig)
    - [`fetchPolicy`](#fetchpolicy)
    - [`prepareVariables`](#preparevariables)
    - [`render`](#render)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->
<!-- prettier-ignore-end -->

## Usage

```js
import { BrowserProtocol, queryMiddleware } from 'farce';
import {
  createFarceRouter,
  createRender,
  makeRouteConfig,
  Route,
} from 'found';
import { Resolver } from 'found-relay';

/* ... */

const Router = createFarceRouter({
  historyProtocol: new BrowserProtocol(),
  historyMiddlewares: [queryMiddleware],
  routeConfig: makeRouteConfig(
    <Route
      path="/"
      Component={Application}
      query={graphql`
        query app_Application_Query {
          viewer {
            ...Application_viewer
          }
        }
      `}
    >
      <Route path="widgets">
        <Route
          Component={WidgetList}
          query={graphql`
            query app_WidgetList_Query {
              widgets {
                ...WidgetList_widgets
              }
            }
          `}
          prepareVariables={prepareWidgetListVariables}
        />
        <Route
          path=":name"
          Component={Widget}
          query={graphql`
            query app_Widget_Query($name: String!) {
              widget(name: $name) {
                ...Widget_widget
              }
            }
          `}
          render={({ props }) => (props ? <Widget {...props} /> : <Loading />)}
        />
      </Route>
    </Route>,
  ),

  render: createRender({}),
});

ReactDOM.render(
  <Router resolver={new Resolver(environment)} />,
  document.getElementById('root'),
);
```

## Examples

- [TodoMVC](/examples/todomvc)
- [TodoMVC with server-side rendering](/examples/todomvc-universal)

## Guide

### Installation

```
$ npm i -S farce found react react-relay
$ npm i -S found-relay
```

### Router configuration

Create a router component class using [`createFarceRouter`](https://github.com/4Catalyzer/found#createfarcerouter) or a lower-level API. Create a `Resolver` with your Relay environment, then use that as the `resolver` instead of the default Found resolver.

```js
import { BrowserProtocol, queryMiddleware } from 'farce';
import { createFarceRouter, createRender } from 'found';
import { Resolver } from 'found-relay';

/* ... */

const Router = createFarceRouter({
  historyProtocol: new BrowserProtocol(),
  historyMiddlewares: [queryMiddleware],
  routeConfig,

  render: createRender({}),
});

ReactDOM.render(
  <Router resolver={new Resolver(environment)} />,
  document.getElementById('root'),
);
```

### Route configuration

Route configuration works similarly to that in Found, but instead of `data` or `getData`, routes accept properties that control Relay data fetching. Each route behaves as if it were its own `<QueryRenderer>`, except that all data fetching happens in parallel, even for nested routes. Found Relay routes accept the following properties:

- `query` or `getQuery`: the Relay query for the route, or a method that returns the Relay query for the route
- `cacheConfig` or `getCacheConfig`: the cache configuration for the route, or a method that returns the cache configuration for the route
- `fetchPolicy` or `getFetchPolicy`: the fetch policy for the Relay data for the route, or a method that returns the fetch policy for the Relay data for the route; `network-only` (the default), `store-and-network`, or `store-or-network`
- `prepareVariables`: a method to apply additional transformations to the route variables
- `render`: as on Found, a method that returns the element for the route, but with additional properties

Note that Found Relay routes ignore `data`, `getData`, and `defer`.

#### `query` or `getQuery`

To inject Relay data into a route, specify `query` or `getQuery` on the route. The value should be a Relay query. In general, `Component` for this route will likely be a fragment container, and the query should compose the fragment or fragments from `Component`.

By default, the available variables for the query will be the accumulated path parameters for this route and its parents. To customize these variables or inject additional ones from the routing state, use `prepareVariables` as described below.

As with `<QueryRenderer>`, upon routing, the route will not refetch its data if its query and variables are the same. To force refetching upon navigation even when the query and variables stay the same, use `prepareVariables` below to add a nonce variable.

#### `cacheConfig` or `getCacheConfig`

As on `<QueryRenderer>`, this value will be forwarded directly to the network layer.

#### `fetchPolicy`

As on `<QueryRenderer>`, this controls the fetch policy for data for the route. In addition to `network-only` and `store-and-network` as on `<QueryRenderer>`, this can also take the value `store-or-network`, which bypasses the network fetch entirely when the data are available in the store.

#### `prepareVariables`

By default, the available variables for the route query will be the accumulated path parameters for this route and its parents. If specified, the `prepareVariables` callback receives the accumulated variables used from all parent routes and the current route match. It should return the updated variables for this route, which will also be accumulated into the variables used for all child routes.

```js
const widgetListRoute = (
  <Route
    path="widgets"
    Component={WidgetList}
    query={graphql`
      query app_WidgetList_Query($color: String, $size: String, $limit: Int) {
        widgets(color: $color, size: $size, limit: $limit) {
          ...WidgetList_widgets
        }
      }
    `}
    prepareVariables={(params, { location }) => {
      const { color, size } = location.query;
      const limit = location.state && location.state.limit;

      return {
        ...params,
        color,
        size: size && parseInt(size, 10),
        limit: limit || 10,
      };
    }}
  />
);
```

#### `render`

This behaves identically to `render` in Found, except its render arguments object receives the following additional properties:

- `error`: the Relay error, if any, as on `render` on `<QueryRenderer>`
- `retry`: when available, a callback that will refetch the data for the route, as on `<QueryRenderer>`
- `environment`: the current Relay environment
- `variables`: an object containing the Relay variables used for the route
- `resolving`: a boolean indicating whether the route is rendering as part of router navigation resolution rather than due to a subsequent store update; in general, it is only safe to throw `HttpError` or `RedirectException` instances to trigger navigation when `resolving` is `true`

If `render` returns a truthy value, then the rendered element will also subscribe to Relay store updates.

[build-badge]: https://img.shields.io/travis/relay-tools/found-relay/master.svg
[build]: https://travis-ci.org/relay-tools/found-relay
[npm-badge]: https://img.shields.io/npm/v/found-relay.svg
[npm]: https://www.npmjs.org/package/found-relay
