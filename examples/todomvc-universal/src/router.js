import queryMiddleware from 'farce/lib/queryMiddleware';
import createRender from 'found/lib/createRender';
import makeRouteConfig from 'found/lib/makeRouteConfig';
import Route from 'found/lib/Route';
import React from 'react';
import { graphql } from 'react-relay';

import TodoApp from './components/TodoApp';
import TodoList from './components/TodoList';

export const historyMiddlewares = [queryMiddleware];

const TodoListQuery = graphql`
  query router_TodoList_Query($status: String!) {
    viewer {
      ...TodoList_viewer
    }
  }
`;

export const routeConfig = makeRouteConfig(
  <Route
    path="/"
    Component={TodoApp}
    query={graphql`
      query router_TodoApp_Query {
        viewer {
          ...TodoApp_viewer
        }
      }
    `}
  >
    <Route
      Component={TodoList}
      query={TodoListQuery}
      prepareVariables={params => ({ ...params, status: 'any' })}
    />
    <Route path=":status" Component={TodoList} query={TodoListQuery} />
  </Route>,
);

export const render = createRender({});
