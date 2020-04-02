import BrowserProtocol from 'farce/BrowserProtocol';
import { Resolver } from 'found-relay';
import createInitialFarceRouter from 'found/createInitialFarceRouter';
import React from 'react';
import ReactDOM from 'react-dom';
import RelayClientSSR from 'react-relay-network-modern-ssr/lib/client';

import createRelayEnvironment from './createRelayEnvironment';
import { historyMiddlewares, routeConfig } from './router';

import 'todomvc-common';

(async () => {
  const resolver = new Resolver(
    createRelayEnvironment(
      // eslint-disable-next-line no-underscore-dangle
      new RelayClientSSR(window.__RELAY_PAYLOADS__),
      '/graphql',
    ),
  );

  const Router = await createInitialFarceRouter({
    historyProtocol: new BrowserProtocol(),
    historyMiddlewares,
    routeConfig,
    resolver,
  });

  ReactDOM.hydrate(
    <Router resolver={resolver} />,
    document.getElementById('root'),
  );
})();
