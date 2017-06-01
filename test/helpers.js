import Relay from 'react-relay';
import RelayLocalSchema from 'relay-local-schema';

import schema from './fixtures/schema';

export function createEnvironment() {
  const environment = new Relay.Environment();
  environment.injectNetworkLayer(
    new RelayLocalSchema.NetworkLayer({ schema }),
  );

  return environment;
}
