import {
  CacheConfig,
  Disposable,
  Environment,
  FetchPolicy,
  GraphQLTaggedNode,
  SelectorData,
  Snapshot,
  Subscription,
  Variables,
  createOperationDescriptor,
  getRequest,
} from 'relay-runtime';

export interface QuerySubscriptionOptions {
  environment: Environment;
  query: GraphQLTaggedNode;
  variables: Variables;
  cacheConfig?: CacheConfig;
  fetchPolicy?: FetchPolicy;
}

export interface ReadyState {
  error: Error | null;
  props: SelectorData | null;
  retry: (() => void) | null;
}
export default class QuerySubscription {
  environment: Environment;

  query: GraphQLTaggedNode;

  variables: Variables;

  cacheConfig: CacheConfig | null | undefined;

  fetchPolicy: FetchPolicy | null | undefined;

  operation: any;

  fetchPromise: Promise<void> | null;

  selectionReference: Disposable | null;

  pendingRequest: Subscription | null;

  rootSubscription: Disposable | null;

  retrying: boolean;

  retryingAfterError: boolean;

  readyState: ReadyState;

  listeners: (() => void)[];

  relayContext: { environment: any; variables: any };

  constructor({
    environment,
    query,
    variables,
    cacheConfig,
    fetchPolicy,
  }: QuerySubscriptionOptions) {
    this.environment = environment;
    this.query = query;
    this.variables = variables;
    this.cacheConfig = cacheConfig;
    this.fetchPolicy = fetchPolicy;

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
      variables: this.operation.request.variables,
    };
  }

  fetch() {
    if (!this.fetchPromise) {
      this.fetchPromise = new Promise((resolve) => {
        this.execute(resolve);
      });
    }

    return this.fetchPromise;
  }

  execute(resolve: () => void) {
    let snapshot: Snapshot | undefined;

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

    const onError = (error: Error) => {
      this.updateReadyState({
        error,
        props: null,
        retry: this.retry,
      });

      resolve();
    };

    const useStoreSnapshot =
      !this.retrying &&
      (this.fetchPolicy === 'store-and-network' ||
        this.fetchPolicy === 'store-or-network') &&
      this.environment.check(this.operation).status === 'available';

    if (!(this.fetchPolicy === 'store-or-network' && useStoreSnapshot)) {
      try {
        this.pendingRequest = this.environment
          .execute({
            operation: this.operation,
          })
          .finally(() => {
            this.pendingRequest = null;
          })
          .subscribe({
            next: onSnapshot,
            error: onError,
          });
      } catch (error: any) {
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

  updateReadyState(readyState: ReadyState) {
    this.readyState = readyState;

    this.listeners.forEach((listener) => {
      listener();
    });
  }

  onChange = (snapshot: Snapshot) => {
    this.updateReadyState({
      error: null,
      props: snapshot.data,
      retry: this.retry,
    });
  };

  subscribe(listener: () => void) {
    this.listeners.push(listener);
  }

  unsubscribe(listener: () => void) {
    this.listeners = this.listeners.filter((item) => item !== listener);
  }

  retry = () => {
    this.retrying = true;
    this.retryingAfterError = !!this.readyState.error;

    this.dispose();
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    this.execute(() => {});
  };

  retain() {
    return this.environment.retain(this.operation);
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
