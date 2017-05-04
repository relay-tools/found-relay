import isPromise from 'is-promise';
import {
  checkResolved, getComponents, getRouteMatches, getRouteValues, isResolved,
} from 'found/lib/ResolverUtils';
import Relay from 'react-relay';
import checkRelayQueryData from 'react-relay/lib/checkRelayQueryData';

import createElements from './createElements';

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

export default function createResolveElements(environment) {
  return async function* resolveElements(match) {
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

    let params = null;

    const routeParams = routeMatches.map((routeMatch) => {
      const { route } = routeMatch;

      // We need to always run this to make sure we don't miss params.
      params = { ...params, ...routeMatch.routeParams };
      if (route.prepareParams) {
        params = route.prepareParams(params, routeMatch);
      }

      return params;
    });

    const queryConfigs = matchQueries.map((queries, i) => {
      if (!queries) {
        return null;
      }

      return {
        name: `__route_${i}_${routeIndices[i]}`,
        queries,
        params: routeParams[i],
      };
    });

    const extraQueries = extraQueryNodes.map((extraQueryNode, i) => {
      if (!extraQueryNode) {
        return null;
      }

      return Relay.createQuery(extraQueryNode, routeParams[i]);
    });

    const earlyComponents = Components.some(isPromise) ?
      await Promise.all(Components.map(checkResolved)) : Components;

    const recordStore = environment.getStoreData().getQueuedStore();

    const earlyReadyStates = earlyComponents.map((Component, i) => {
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

    const earlyRouteExtraData = extraQueries.map((extraQuery, i) => (
      extraQuery && earlyReadyStates[i].ready ?
        environment.readQuery(extraQuery)[0] : null
    ));

    if (earlyReadyStates.some(readyState => readyState && !readyState.done)) {
      yield createElements(
        environment,
        routeMatches,
        earlyComponents,
        queryConfigs,
        earlyReadyStates,
        null, // No retry here, as these will never be in error.
        earlyRouteExtraData,
      );
    }

    const fetchedComponents = earlyComponents.every(isResolved) ?
      earlyComponents : await Promise.all(Components);

    const routeRunQueries = fetchedComponents.map((Component, i) => {
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
        while (hasOwnProperty.call(querySet, extraQueryKey)) {
          extraQueryKey = `_${extraQueryKey}`;
        }

        // Relay caches query sets, so it's very important to not modify the
        // query set in-place.
        querySet = { ...querySet, [extraQueryKey]: extraQuery };
      }

      return function runQueries(onReadyStateChange) {
        return forceFetches[i] ?
          environment.forceFetch(querySet, onReadyStateChange) :
          environment.primeCache(querySet, onReadyStateChange);
      };
    });

    // TODO: What about deferred queries?
    const fetchedReadyStates = await Promise.all(routeRunQueries.map(
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

    const routeExtraData = extraQueries.map((extraQuery, i) => (
      extraQuery && fetchedReadyStates[i].ready ?
        environment.readQuery(extraQuery)[0] : null
    ));

    yield createElements(
      environment,
      routeMatches,
      fetchedComponents,
      queryConfigs,
      fetchedReadyStates,
      routeRunQueries,
      routeExtraData,
    );
  };
}
