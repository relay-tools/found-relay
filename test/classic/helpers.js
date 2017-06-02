import Relay from 'react-relay/classic';
import RelayLocalSchema from 'relay-local-schema/lib/classic';

import schema from '../fixtures/schema';

export function createEnvironment() {
  const environment = new Relay.Environment();
  environment.injectNetworkLayer(
    new RelayLocalSchema.NetworkLayer({ schema }),
  );

  return environment;
}
