import makeRouteConfig from 'found/lib/makeRouteConfig';
import Route from 'found/lib/Route';
import React from 'react';
import { graphql } from 'react-relay';

import TodoApp from './components/TodoApp';
import TodoList from './components/TodoList';

const TodoListQuery = graphql`
  query routes_TodoList_Query($status: String!) {
    viewer {
      ...TodoList_viewer
    }
  }
`;

export default makeRouteConfig(
  <Route
    path="/"
    Component={TodoApp}
    query={graphql`
      query routes_TodoApp_Query {
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
