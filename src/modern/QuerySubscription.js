import invariant from 'invariant';

export default class QuerySubscription {
  constructor(environment, operation, cacheConfig) {
    this.environment = environment;
    this.operation = operation;
    this.cacheConfig = cacheConfig;

    this.fetchPromise = null;
    this.selectionReference = null;
    this.pendingRequest = null;
    this.rootSubscription = null;

    this.readyState = {
      error: null,
      props: null,
      retry: null,
    };

    this.listener = null;

    this.relayContext = {
      environment: this.environment,
      variables: this.operation.variables,
    };
  }

  fetch() {
    if (!this.fetchPromise) {
      this.fetchPromise = new Promise((resolve, reject) => {
        let snapshot;

        this.selectionReference = this.retain();

        this.pendingRequest = this.environment.streamQuery({
          operation: this.operation,
          cacheConfig: this.cacheConfig,

          onNext: () => {
            if (snapshot) {
              return;
            }

            snapshot = this.environment.lookup(this.operation.fragment);
            this.updateReadyState(snapshot);
            this.rootSubscription = this.environment.subscribe(
              snapshot, this.onChange,
            );

            resolve();
          },

          onCompleted: () => {
            this.pendingRequest = null;
          },

          onError: (error) => {
            this.readyState = {
              error,
              props: null,
              retry: this.retry,
            };
            this.pendingRequest = null;

            reject();
          },
        });
      });
    }

    return this.fetchPromise;
  }

  updateReadyState(snapshot) {
    this.readyState = {
      error: null,
      props: snapshot.data,
      retry: this.retry,
    };
  }

  onChange = (snapshot) => {
    this.updateReadyState(snapshot);

    if (this.listener) {
      this.listener(this.readyState);
    }
  };

  subscribe(listener) {
    invariant(!this.listener, 'QuerySubscription already has a listener.');

    this.listener = listener;
  }

  retry = () => {
    this.dispose();
    this.fetch();
  };

  retain() {
    return this.environment.retain(this.operation.root);
  }

  dispose() {
    if (this.selectionReference) {
      this.selectionReference.dispose();
    }

    if (this.pendingRequest) {
      this.pendingRequest.dispose();
    }

    if (this.rootSubscription) {
      this.rootSubscription.dispose();
    }
  }
}
