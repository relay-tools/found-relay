import HashProtocol from 'farce/HashProtocol';
import queryMiddleware from 'farce/queryMiddleware';
import { Resolver } from 'found-relay';
import createFarceRouter from 'found/createFarceRouter';
import React from 'react';
import ReactDOM from 'react-dom';
import { Network } from 'relay-local-schema';
import { Environment, RecordSource, Store } from 'relay-runtime';

import schema from './data/schema';
import routes from './routes';

import 'todomvc-common';
import 'todomvc-common/base.css';
import 'todomvc-app-css/index.css';

const environment = new Environment({
  network: Network.create({ schema }),
  store: new Store(new RecordSource()),
});

const Router = createFarceRouter({
  historyProtocol: new HashProtocol(),
  historyMiddlewares: [queryMiddleware],
  routeConfig: routes,
});

const mountNode = document.createElement('div');
document.body.appendChild(mountNode);

ReactDOM.render(<Router resolver={new Resolver(environment)} />, mountNode);
