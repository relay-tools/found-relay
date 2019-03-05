import BrowserProtocol from 'farce/lib/BrowserProtocol';
import createInitialFarceRouter from 'found/lib/createInitialFarceRouter';
import { Resolver } from 'found-relay';
import React from 'react';
import ReactDOM from 'react-dom';
import RelayClientSSR from 'react-relay-network-modern-ssr/lib/client';

import createRelayEnvironment from './createRelayEnvironment';
import { historyMiddlewares, render, routeConfig } from './router';

import 'todomvc-common/base';

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
    render,
  });

  ReactDOM.hydrate(
    <Router resolver={resolver} />,
    document.getElementById('root'),
  );
})();
