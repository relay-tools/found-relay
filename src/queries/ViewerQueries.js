import Relay from 'react-relay/classic';

export default {
  viewer: () => Relay.QL`query { viewer }`,
};
