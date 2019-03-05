import { RelayNetworkLayer, urlMiddleware } from 'react-relay-network-modern';
import { Environment, RecordSource, Store } from 'relay-runtime';

export default function createRelayEnvironment(relaySsr, url) {
  return new Environment({
    network: new RelayNetworkLayer([
      relaySsr.getMiddleware(),
      urlMiddleware({ url }),
    ]),
    store: new Store(new RecordSource()),
  });
}
