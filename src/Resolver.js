import {
  accumulateRouteValues,
  checkResolved,
  getComponents,
  getRouteMatches,
  getRouteValues,
  isResolved,
} from 'found/lib/ResolverUtils';
import isPromise from 'is-promise';
import isEqual from 'lodash/isEqual';
import React from 'react';
import warning from 'warning';

import QuerySubscription from './QuerySubscription';
import ReadyStateRenderer from './ReadyStateRenderer';
import renderElement from './renderElement';

export default class Resolver {
  constructor(environment) {
    this.environment = environment;

    this.lastQuerySubscriptions = [];
  }

  async *resolveElements(match) {
    const routeMatches = getRouteMatches(match);

    const Components = getComponents(routeMatches);
    const queries = getRouteValues(
      routeMatches,
      (route) => route.getQuery,
      (route) => route.query,
    );
    const cacheConfigs = getRouteValues(
      routeMatches,
      (route) => route.getCacheConfig,
      (route) => route.cacheConfig,
    );
    const fetchPolicies = getRouteValues(
      routeMatches,
      (route) => route.getFetchPolicy,
      (route) => route.fetchPolicy,
    );

    warning(
      !routeMatches.some(({ route }) => route.dataFrom),
      '`dataFrom` on routes no longer has any effect; use `fetchPolicy` instead.',
    );
    warning(
      !routeMatches.some(({ route }) => route.getDataFrom),
      '`getDataFrom` on routes no longer has any effect; use `getFetchPolicy` instead.',
    );

    const routeVariables = this.getRouteVariables(match, routeMatches);
    const querySubscriptions = this.updateQuerySubscriptions(
      queries,
      routeVariables,
      cacheConfigs,
      fetchPolicies,
    );

    const fetches = querySubscriptions.map(
      (querySubscription) => querySubscription && querySubscription.fetch(),
    );

    const earlyComponents = Components.some(isPromise)
      ? await Promise.all(Components.map(checkResolved))
      : Components;
    const earlyData = await Promise.all(fetches.map(checkResolved));

    let fetchedComponents;

    if (!earlyComponents.every(isResolved) || !earlyData.every(isResolved)) {
      const pendingElements = this.createElements(
        routeMatches,
        earlyComponents,
        querySubscriptions,
        false,
      );

      yield pendingElements.every((element) => element !== undefined)
        ? pendingElements
        : undefined;

      fetchedComponents = await Promise.all(Components);
      await Promise.all(fetches);
    } else {
      fetchedComponents = earlyComponents;
    }

    yield this.createElements(
      routeMatches,
      fetchedComponents,
      querySubscriptions,
      true,
    );
  }

  getRouteVariables(match, routeMatches) {
    return accumulateRouteValues(
      routeMatches,
      match.routeIndices,
      (variables, routeMatch) => {
        const { route, routeParams } = routeMatch;

        // We need to always run this to make sure we don't miss route params.
        let nextVariables = { ...variables, ...routeParams };
        if (route.prepareVariables) {
          nextVariables = route.prepareVariables(nextVariables, routeMatch);
        }

        return nextVariables;
      },
      null,
    );
  }

  updateQuerySubscriptions(
    queries,
    routeVariables,
    cacheConfigs,
    fetchPolicies,
  ) {
    const querySubscriptions = queries.map((query, i) => {
      if (!query) {
        return null;
      }

      const variables = routeVariables[i];
      const lastQuerySubscription = this.lastQuerySubscriptions[i];

      // Match the logic in <QueryRenderer> for not refetching.
      if (
        lastQuerySubscription &&
        lastQuerySubscription.query === query &&
        isEqual(lastQuerySubscription.variables, variables)
      ) {
        this.lastQuerySubscriptions[i] = null;
        return lastQuerySubscription;
      }

      return new QuerySubscription({
        environment: this.environment,
        query,
        variables,
        cacheConfig: cacheConfigs[i],
        fetchPolicy: fetchPolicies[i],
      });
    });

    this.lastQuerySubscriptions.forEach((querySubscription) => {
      if (querySubscription) {
        querySubscription.dispose();
      }
    });

    this.lastQuerySubscriptions = [...querySubscriptions];

    return querySubscriptions;
  }

  createElements(routeMatches, Components, querySubscriptions, fetched) {
    return routeMatches.map((match, i) => {
      const { route, router } = match;

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

        return Component ? <Component match={match} router={router} /> : null;
      }

      const resolvedComponent = isComponentResolved ? Component : null;
      const hasComponent = Component != null;

      const element = renderElement({
        match,
        Component: resolvedComponent,
        isComponentResolved,
        hasComponent,
        querySubscription,
        resolving: true,
      });

      if (!element) {
        return element;
      }

      return (routeChildren) => (
        <ReadyStateRenderer
          match={match}
          Component={resolvedComponent}
          isComponentResolved={isComponentResolved}
          hasComponent={hasComponent}
          element={element}
          routeChildren={routeChildren}
          querySubscription={querySubscription}
          fetched={fetched}
        />
      );
    });
  }
}
