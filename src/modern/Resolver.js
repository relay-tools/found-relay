import {
  checkResolved, getComponents, getRouteMatches, getRouteValues, isResolved,
} from 'found/lib/ResolverUtils';
import isPromise from 'is-promise';
import isEqual from 'lodash/isEqual';
import React from 'react';

import QuerySubscription from './QuerySubscription';
import ReadyStateRenderer from './ReadyStateRenderer';
import renderElement from './renderElement';

export default class Resolver {
  constructor(environment) {
    this.environment = environment;

    this.lastQueries = [];
    this.lastRouteVariables = [];
    this.lastQuerySubscriptions = [];
  }

  async * resolveElements(match) {
    const routeMatches = getRouteMatches(match);

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
    const querySubscriptions = this.updateQuerySubscriptions(
      queries, routeVariables, cacheConfigs,
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

  updateQuerySubscriptions(queries, routeVariables, cacheConfigs) {
    const { createOperationSelector, getOperation } =
      this.environment.unstable_internal;

    const querySubscriptions = queries.map((query, i) => {
      if (!query) {
        return null;
      }

      const variables = routeVariables[i];

      if (
        this.lastQueries[i] === query &&
        isEqual(this.lastRouteVariables[i], variables)
      ) {
        // Match the logic in <QueryRenderer> for not refetching.
        const lastQuerySubscription = this.lastQuerySubscriptions[i];
        this.lastQuerySubscriptions[i] = null;
        return lastQuerySubscription;
      }

      return new QuerySubscription(
        this.environment,
        createOperationSelector(getOperation(query), variables),
        cacheConfigs[i],
      );
    });

    this.lastQuerySubscriptions.forEach((querySubscription) => {
      if (querySubscription) {
        querySubscription.dispose();
      }
    });

    this.lastQueries = queries;
    this.lastRouteVariables = routeVariables;
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

      const resolvedComponent = isComponentResolved ? Component : null;
      const hasComponent = Component != null;

      const element = renderElement({
        match,
        Component: resolvedComponent,
        hasComponent,
        readyState: querySubscription.readyState,
        resolving: true,
      });

      return (
        <ReadyStateRenderer
          match={match}
          Component={resolvedComponent}
          hasComponent={hasComponent}
          element={element}
          querySubscription={querySubscription}
        />
      );
    });
  }
}
