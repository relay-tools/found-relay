import { createFetch } from 'relay-local-schema';
import { Environment, Network, RecordSource, Store } from 'relay-runtime';

import schema from '../fixtures/schema';

export function createFakeFetch() {
  return createFetch({ schema });
}

// Delay field resolution to exercise async data fetching logic.
function delay(value) {
  return new Promise(((resolve) => { setTimeout(resolve, 10, value); }));
}

export function createEnvironment(fetch = createFakeFetch()) {
  return new Environment({
    network: Network.create(
      (...args) => delay(fetch(...args)),
    ),
    store: new Store(new RecordSource()),
  });
}
