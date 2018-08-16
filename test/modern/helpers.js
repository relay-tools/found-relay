import { createFetch } from 'relay-local-schema';
import { Environment, Network, RecordSource, Store } from 'relay-runtime';

import { Resolver } from '../../src';

import schema from '../fixtures/schema';

export function createFakeFetch() {
  return createFetch({ schema });
}

export function timeout(delay) {
  return new Promise(resolve => {
    setTimeout(resolve, delay);
  });
}

export function createSyncEnvironment(fetch = createFakeFetch(), records) {
  return new Environment({
    network: Network.create(fetch),
    store: new Store(new RecordSource(records)),
  });
}

export function createEnvironment(fetch = createFakeFetch(), records) {
  return createSyncEnvironment(async (...args) => {
    // Delay field resolution to exercise async data fetching logic.
    await timeout(20);
    return fetch(...args);
  }, records);
}

export class InstrumentedResolver extends Resolver {
  constructor(environment = createEnvironment()) {
    super(environment);

    // This should be a rejected promise to prevent awaiting on done before
    // trying to resolve, but Node doesn't like naked unresolved promises.
    this.done = new Promise(() => {});
  }

  async *resolveElements(match) {
    let resolveDone;
    this.done = new Promise(resolve => {
      resolveDone = resolve;
    });

    yield* super.resolveElements(match);
    resolveDone();
  }
}
