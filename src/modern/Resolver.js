import {
  checkResolved, getComponents, getRouteMatches, getRouteValues, isResolved,
} from 'found/lib/ResolverUtils';
import isPromise from 'is-promise';
import React from 'react';

import QuerySubscription from './QuerySubscription';
import ReadyStateRenderer from './ReadyStateRenderer';

export default class Resolver {
  constructor(environment) {
    this.environment = environment;

    this.lastQuerySubscriptions = [];
  }

  async * resolveElements(match) {
    // TODO: Close over and abort earlier requests.

    const routeMatches = getRouteMatches(match);

    // These

    const Components = getComponents(routeMatches);
    const queries = getRouteValues(
      routeMatches,
      route => route.getQuery,
      route => route.query,
    );
    const cacheConfigs = getRouteValues(
      routeMatches,
      route => route.getCacheConfig,
      route => route.cacheConfig,
    );

    const routeVariables = this.getRouteVariables(routeMatches);
    const operations = this.getOperations(queries, routeVariables);
    const querySubscriptions = this.updateQuerySubscriptions(
      operations, cacheConfigs,
    );

    const fetches = querySubscriptions.map(querySubscription => (
      querySubscription && querySubscription.fetch()
    ));

    const earlyComponents = Components.some(isPromise) ?
      await Promise.all(Components.map(checkResolved)) : Components;
    const earlyData = await Promise.all(fetches.map(checkResolved));

    let fetchedComponents;

    if (!earlyComponents.every(isResolved) || !earlyData.every(isResolved)) {
      yield this.createElements(
        routeMatches,
        earlyComponents,
        querySubscriptions,
      );

      fetchedComponents = await Promise.all(Components);
      await Promise.all(fetches);
    } else {
      fetchedComponents = earlyComponents;
    }

    yield this.createElements(
      routeMatches,
      fetchedComponents,
      querySubscriptions,
    );
  }

  getRouteVariables(routeMatches) {
    let variables = null;

    return routeMatches.map((routeMatch) => {
      const { route } = routeMatch;

      // We need to always run this to make sure we don't miss route params.
      variables = { ...variables, ...routeMatch.routeParams };
      if (route.prepareVariables) {
        variables = route.prepareVariables(variables, routeMatch);
      }

      return variables;
    });
  }

  getOperations(queries, routeVariables) {
    const { createOperationSelector, getOperation } =
      this.environment.unstable_internal;

    return queries.map((query, i) => {
      if (!query) {
        // TODO: Warn if variables are specified?
        return null;
      }

      return createOperationSelector(getOperation(query), routeVariables[i]);
    });
  }

  updateQuerySubscriptions(operations, cacheConfigs) {
    // TODO: Reuse unchanged query subscriptions.
    this.lastQuerySubscriptions.forEach((querySubscription) => {
      if (querySubscription) {
        querySubscription.dispose();
      }
    });

    const querySubscriptions = operations.map((operation, i) => (
      operation && new QuerySubscription(
        this.environment, operation, cacheConfigs[i],
      )
    ));

    this.lastQuerySubscriptions = querySubscriptions;
    return querySubscriptions;
  }

  createElements(routeMatches, Components, querySubscriptions) {
    return routeMatches.map((match, i) => {
      const { route } = match;

      const Component = Components[i];
      const querySubscription = querySubscriptions[i];

      const isComponentResolved = isResolved(Component);

      // Handle non-Relay routes.
      if (!querySubscription) {
        if (route.render) {
          return route.render({
            match,
            Component: isComponentResolved ? Component : null,
            props: match,
          });
        }

        if (!isComponentResolved) {
          return undefined;
        }

        return Component ? <Component {...match} /> : null;
      }

      if (route.prerender) {
        route.prerender({ ...querySubscription.readyState, match });
      }

      return (
        <ReadyStateRenderer
          match={match}
          Component={isComponentResolved ? Component : null}
          hasComponent={Component != null}
          querySubscription={querySubscription}
        />
      );
    });
  }
}
