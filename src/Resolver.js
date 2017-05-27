import isPromise from 'is-promise';
import {
  checkResolved, getComponents, getRouteMatches, getRouteValues, isResolved,
} from 'found/lib/ResolverUtils';
import React from 'react';
import Relay from 'react-relay';
import checkRelayQueryData from 'react-relay/lib/checkRelayQueryData';

import RelayRouteRenderer from './RelayRouteRenderer';

const { hasOwnProperty } = Object.prototype;

// TODO: Should we disable Relay query caching for SSR? If so, we should cache
// query sets ourselves.

const PENDING_READY_STATE = {
  aborted: false,
  done: false,
  error: null,
  events: [],
  ready: false,
  stale: false,
};

const STALE_READY_STATE = {
  ...PENDING_READY_STATE,
  ready: true,
  stale: true,
};

const DONE_READY_STATE = {
  ...PENDING_READY_STATE,
  done: true,
  ready: true,
};

export default class Resolver {
  constructor(environment) {
    this.environment = environment;
  }

  async * resolveElements(match) {
    // TODO: Close over and abort earlier requests?

    const routeMatches = getRouteMatches(match);
    const { routeIndices } = match;

    const Components = getComponents(routeMatches);
    const matchQueries = getRouteValues(
      routeMatches,
      route => route.getQueries,
      route => route.queries,
    );
    const extraQueryNodes = getRouteValues(
      routeMatches,
      route => route.getExtraQuery,
      route => route.extraQuery,
    );
    const forceFetches = getRouteValues(
      routeMatches,
      route => route.getForceFetch,
      route => route.forceFetch,
    );

    const routeParams = this.getRouteParams(routeMatches);
    const queryConfigs = this.getQueryConfigs(
      matchQueries, routeIndices, routeParams,
    );
    const extraQueries = this.getExtraQueries(extraQueryNodes, routeParams);

    const earlyComponents = Components.some(isPromise) ?
      await Promise.all(Components.map(checkResolved)) : Components;
    const earlyReadyStates = this.getEarlyReadyStates(
      earlyComponents, queryConfigs, extraQueries, forceFetches,
    );

    if (earlyReadyStates.some(readyState => readyState && !readyState.done)) {
      yield this.createElements(
        routeMatches,
        earlyComponents,
        queryConfigs,
        earlyReadyStates,
        null, // No retry here, as these will never be in error.
        extraQueries,
      );
    }

    const fetchedComponents = earlyComponents.every(isResolved) ?
      earlyComponents : await Promise.all(Components);
    const routeRunQueries = this.getRouteRunQueries(
      fetchedComponents, queryConfigs, extraQueries, forceFetches,
    );
    const fetchedReadyStates = await this.getFetchedReadyStates(
      routeRunQueries,
    );

    yield this.createElements(
      routeMatches,
      fetchedComponents,
      queryConfigs,
      fetchedReadyStates,
      routeRunQueries,
      extraQueries,
    );
  }

  getRouteParams(routeMatches) {
    let params = null;

    return routeMatches.map((routeMatch) => {
      const { route } = routeMatch;

      // We need to always run this to make sure we don't miss params.
      params = { ...params, ...routeMatch.routeParams };
      if (route.prepareParams) {
        params = route.prepareParams(params, routeMatch);
      }

      return params;
    });
  }

  getQueryConfigs(matchQueries, routeIndices, routeParams) {
    return matchQueries.map((queries, i) => {
      if (!queries) {
        return null;
      }

      return {
        name: `__route_${i}_${routeIndices[i]}`,
        queries,
        params: routeParams[i],
      };
    });
  }

  getExtraQueries(extraQueryNodes, routeParams) {
    return extraQueryNodes.map((extraQueryNode, i) => {
      if (!extraQueryNode) {
        return null;
      }

      return Relay.createQuery(extraQueryNode, routeParams[i]);
    });
  }

  getEarlyReadyStates(
    earlyComponents, queryConfigs, extraQueries, forceFetches,
  ) {
    const recordStore = this.environment.getStoreData().getQueuedStore();

    return earlyComponents.map((Component, i) => {
      const queryConfig = queryConfigs[i];
      const extraQuery = extraQueries[i];

      if (!queryConfig && !extraQuery) {
        return null;
      }

      if (!isResolved(Component)) {
        return PENDING_READY_STATE;
      }

      // TODO: What about deferred queries?
      // We use checkRelayQueryData here because I want to batch all the Relay
      // requests. We can send out requests for resolved components, but that
      // runs the risk of the data we request now being out-of-sync with the
      // data we request later.
      if (queryConfig) {
        const querySet = Relay.getQueries(Component, queryConfig);
        const hasQueryData = Object.values(querySet).every(query => (
          !query || checkRelayQueryData(recordStore, query)
        ));

        if (!hasQueryData) {
          return PENDING_READY_STATE;
        }
      }

      if (extraQuery && !checkRelayQueryData(recordStore, extraQuery)) {
        return PENDING_READY_STATE;
      }

      return forceFetches[i] ? STALE_READY_STATE : DONE_READY_STATE;
    });
  }

  getRouteRunQueries(
    fetchedComponents, queryConfigs, extraQueries, forceFetches,
  ) {
    return fetchedComponents.map((Component, i) => {
      const queryConfig = queryConfigs[i];
      const extraQuery = extraQueries[i];

      if (!queryConfig && !extraQuery) {
        return null;
      }

      let querySet;
      if (queryConfig) {
        querySet = Relay.getQueries(Component, queryConfig);
      }

      if (extraQuery) {
        let extraQueryKey = '__extra';
        while (querySet && hasOwnProperty.call(querySet, extraQueryKey)) {
          extraQueryKey = `_${extraQueryKey}`;
        }

        // Relay caches query sets, so it's very important to not modify the
        // query set in-place.
        querySet = { ...querySet, [extraQueryKey]: extraQuery };
      }

      return onReadyStateChange => (
        forceFetches[i] ?
          this.environment.forceFetch(querySet, onReadyStateChange) :
          this.environment.primeCache(querySet, onReadyStateChange)
      );
    });
  }

  getFetchedReadyStates(routeRunQueries) {
    // TODO: What about deferred queries?
    return Promise.all(routeRunQueries.map(
      (runQueries) => {
        if (!runQueries) {
          return null;
        }

        return new Promise((resolve) => {
          runQueries((readyState) => {
            if (readyState.aborted || readyState.done || readyState.error) {
              resolve(readyState);
            }
          });
        });
      },
    ));
  }

  createElements(
    routeMatches,
    Components,
    queryConfigs,
    readyStates,
    routeRunQueries,
    extraQueries,
  ) {
    return routeMatches.map((match, i) => {
      const { route } = match;

      const Component = Components[i];
      const queryConfig = queryConfigs[i];
      const readyState = readyStates[i];
      const extraQuery = extraQueries[i];

      const extraData = this.getExtraData(extraQuery, readyState);
      const isComponentResolved = isResolved(Component);

      // Handle non-Relay routes.
      if (!queryConfig) {
        if (route.prerender) {
          route.prerender({ ...readyState, match, extraData });
        }

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
        route.prerender({ ...readyState, match, extraData });
      }

      if (!isComponentResolved) {
        // Can't render a RelayReadyStateRenderer here.
        if (route.render) {
          return route.render({
            ...readyState,
            match,
            Component: null,
            props: null,
          });
        }

        return undefined;
      }

      // If there's a query config, then there must be a component.
      return (
        <RelayRouteRenderer
          match={match}
          Component={Component}
          environment={this.environment}
          queryConfig={queryConfig}
          readyState={readyState}
          runQueries={routeRunQueries && routeRunQueries[i]}
        />
      );
    });
  }

  getExtraData(extraQuery, readyState) {
    if (!extraQuery || !readyState.ready) {
      return null;
    }

    const identifyingArg = extraQuery.getIdentifyingArg();
    const queryData = this.environment.readQuery(extraQuery);
    const fieldData = identifyingArg && Array.isArray(identifyingArg.value) ?
      queryData : queryData[0];

    return { [extraQuery.getFieldName()]: fieldData };
  }
}
