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

    this.listeners = [];

    this.relayContext = {
      environment: this.environment,
      variables: this.operation.variables,
    };
  }

  fetch() {
    if (!this.fetchPromise) {
      this.fetchPromise = new Promise((resolve) => {
        let snapshot;

        this.selectionReference = this.retain();

        this.pendingRequest = this.environment
          .execute({
            operation: this.operation,
            cacheConfig: this.cacheConfig,
          })
          .finally(() => {
            this.pendingRequest = null;
          })
          .subscribe({
            next: () => {
              if (snapshot) {
                return;
              }

              snapshot = this.environment.lookup(this.operation.fragment);

              // TODO: Explicitly track whether this is the first resolution.
              // retry is unset only for the initial request.
              if (this.readyState.retry) {
                // We've already fetched once. That means this isn't an initial
                // render, so we need to trigger listeners.
                this.onChange(snapshot);
              } else {
                // Don't trigger listeners on the initial fetch, because the
                // resolver will trigger an update and make ReadyStateRenderers
                // rerender anyway.
                this.updateReadyState(snapshot);
              }

              this.rootSubscription = this.environment.subscribe(
                snapshot, this.onChange,
              );

              resolve();
            },

            error: (error) => {
              this.readyState = {
                error,
                props: null,
                // FIXME: Use default readyState when retrying.
                retry: this.retry,
              };
              // FIXME: Fire listeners on receiving error.

              resolve();
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

    this.listeners.forEach((listener) => {
      listener(this.readyState);
    });
  };

  subscribe(listener) {
    this.listeners.push(listener);
  }

  unsubscribe(listener) {
    this.listeners = this.listeners.filter(item => item !== listener);
  }

  retry = () => {
    this.dispose();
    this.fetch();
  };

  retain() {
    return this.environment.retain(this.operation.root);
  }

  dispose() {
    this.fetchPromise = null;

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
