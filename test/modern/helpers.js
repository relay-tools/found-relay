import { createFetch } from 'relay-local-schema';
import { Environment, Network, RecordSource, Store } from 'relay-runtime';

import { Resolver } from '../../src';

import schema from '../fixtures/schema';

export function createFakeFetch() {
  return createFetch({ schema });
}

// Delay field resolution to exercise async data fetching logic.
function delay(promise) {
  return new Promise((resolve, reject) => {
    promise.then(
      (value) => { setTimeout(resolve, 10, value); },
      (error) => { setTimeout(reject, 10, error); },
    );
  });
}

export function createEnvironment(fetch = createFakeFetch()) {
  return new Environment({
    network: Network.create(
      (...args) => delay(fetch(...args)),
    ),
    store: new Store(new RecordSource()),
  });
}

export class InstrumentedResolver extends Resolver {
  constructor(environment = createEnvironment()) {
    super(environment);

    // This should be a rejected promise to prevent awaiting on done before
    // trying to resolve, but Node doesn't like naked unresolved promises.
    this.done = new Promise(() => {});
  }

  async * resolveElements(match) {
    let resolveDone;
    this.done = new Promise((resolve) => {
      resolveDone = resolve;
    });

    yield* super.resolveElements(match);
    resolveDone();
  }
}
