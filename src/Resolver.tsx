import { dequal } from 'dequal';
import type { Match } from 'found';
import {
  accumulateRouteValues,
  checkResolved,
  getComponents,
  getRouteMatches,
  getRouteValues,
  isResolved,
  // @ts-expect-error
} from 'found/ResolverUtils';
import isPromise from 'is-promise';
import React, { ReactElement } from 'react';
import type {
  CacheConfig,
  Environment,
  FetchPolicy,
  GraphQLTaggedNode,
  Variables,
} from 'relay-runtime';

import QuerySubscription from './QuerySubscription';
import ReadyStateRenderer from './ReadyStateRenderer';
import renderElement from './renderElement';

export default class Resolver {
  private lastQuerySubscriptions: (QuerySubscription | null)[];

  environment: Environment;

  constructor(environment: Environment) {
    this.environment = environment;

    this.lastQuerySubscriptions = [];
  }

  async *resolveElements(match: Match) {
    const routeMatches = getRouteMatches(match);

    const Components = getComponents(routeMatches);
    const queries = getRouteValues(
      routeMatches,
      (route: any) => route.getQuery,
      (route: any) => route.query,
    );
    const cacheConfigs = getRouteValues(
      routeMatches,
      (route: any) => route.getCacheConfig,
      (route: any) => route.cacheConfig,
    );
    const fetchPolicies = getRouteValues(
      routeMatches,
      (route: any) => route.getFetchPolicy,
      (route: any) => route.fetchPolicy,
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

      yield pendingElements.every(
        (element: ReactElement) => element !== undefined,
      )
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

  getRouteVariables(match: Match, routeMatches: any[]) {
    return accumulateRouteValues(
      routeMatches,
      match.routeIndices,
      (variables: Variables, routeMatch: any) => {
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
    queries: Array<GraphQLTaggedNode | null | undefined>,
    routeVariables: Array<Variables | null | undefined>,
    cacheConfigs: Array<CacheConfig | null | undefined>,
    fetchPolicies: Array<FetchPolicy | null | undefined>,
  ) {
    const querySubscriptions = queries.map((query, i) => {
      if (!query) {
        return null;
      }

      const variables = routeVariables[i]!;
      const cacheConfig = cacheConfigs[i]!;
      const fetchPolicy = fetchPolicies[i]!;

      const lastQuerySubscription = this.lastQuerySubscriptions[i];

      // Match the logic in <QueryRenderer> for not refetching.
      if (
        lastQuerySubscription &&
        lastQuerySubscription.query === query &&
        dequal(lastQuerySubscription.variables, variables)
      ) {
        this.lastQuerySubscriptions[i] = null;

        lastQuerySubscription.cacheConfig = cacheConfig;
        lastQuerySubscription.fetchPolicy = fetchPolicy;

        return lastQuerySubscription;
      }

      return new QuerySubscription({
        environment: this.environment,
        query,
        variables,
        cacheConfig,
        fetchPolicy,
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

  createElements(
    routeMatches: any[],
    Components: any[],
    querySubscriptions: Array<QuerySubscription | null>,
    fetched: boolean,
  ) {
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
            props: { match, router },
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

      return (routeChildren: React.ReactElement) => (
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
