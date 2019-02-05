export default class QuerySubscription {
  constructor({ environment, query, variables, cacheConfig, dataFrom }) {
    this.environment = environment;
    this.query = query;
    this.variables = variables;
    this.cacheConfig = cacheConfig;
    this.dataFrom = dataFrom;

    const {
      createOperationDescriptor,
      getRequest,
    } = this.environment.unstable_internal;

    this.operation = createOperationDescriptor(getRequest(query), variables);

    this.fetchPromise = null;
    this.selectionReference = null;
    this.pendingRequest = null;
    this.rootSubscription = null;

    this.retrying = false;
    this.retryingAfterError = false;

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
      this.fetchPromise = new Promise(resolve => {
        this.execute(resolve);
      });
    }

    return this.fetchPromise;
  }

  execute(resolve) {
    let snapshot;

    this.selectionReference = this.retain();

    const onSnapshot = () => {
      if (snapshot) {
        return;
      }

      snapshot = this.environment.lookup(this.operation.fragment);

      this.onChange(snapshot);

      this.rootSubscription = this.environment.subscribe(
        snapshot,
        this.onChange,
      );

      resolve();
    };

    const onError = error => {
      this.updateReadyState({
        error,
        props: null,
        retry: this.retry,
      });

      resolve();
    };

    const useStoreSnapshot =
      !this.retrying &&
      (this.dataFrom === 'STORE_THEN_NETWORK' ||
        this.dataFrom === 'STORE_OR_NETWORK') &&
      this.environment.check(this.operation.root);

    if (!(this.dataFrom === 'STORE_OR_NETWORK' && useStoreSnapshot)) {
      try {
        this.pendingRequest = this.environment
          .execute({
            operation: this.operation,
            cacheConfig: this.cacheConfig,
          })
          .finally(() => {
            this.pendingRequest = null;
          })
          .subscribe({
            next: onSnapshot,
            error: onError,
          });
      } catch (error) {
        onError(error);
        return;
      }
    }

    // Only use the store snapshot if the network layer doesn't synchronously
    // resolve a snapshot, to match <QueryRenderer>.
    if (!snapshot && useStoreSnapshot) {
      onSnapshot();
    }

    if (!snapshot && this.retryingAfterError) {
      this.updateReadyState({
        error: null,
        props: null,
        retry: null,
      });
    }
  }

  updateReadyState(readyState) {
    this.readyState = readyState;

    this.listeners.forEach(listener => {
      listener();
    });
  }

  onChange = snapshot => {
    this.updateReadyState({
      error: null,
      props: snapshot.data,
      retry: this.retry,
    });
  };

  subscribe(listener) {
    this.listeners.push(listener);
  }

  unsubscribe(listener) {
    this.listeners = this.listeners.filter(item => item !== listener);
  }

  retry = () => {
    this.retrying = true;
    this.retryingAfterError = !!this.readyState.error;

    this.dispose();
    this.execute(() => {});
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
      this.pendingRequest.unsubscribe();
    }

    if (this.rootSubscription) {
      this.rootSubscription.dispose();
    }
  }

  getQueryName() {
    return this.operation.root.node.name;
  }
}
