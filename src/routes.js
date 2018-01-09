import makeRouteConfig from 'found/lib/makeRouteConfig';
import Route from 'found/lib/Route';
import React from 'react';

import TodoApp from './components/TodoApp';
import TodoList from './components/TodoList';
import ViewerQueries from './queries/ViewerQueries';

export default makeRouteConfig(
  <Route path="/" Component={TodoApp} queries={ViewerQueries}>
    <Route
      Component={TodoList}
      queries={ViewerQueries}
      prepareParams={params => ({ ...params, status: 'any' })}
    />
    <Route path=":status" Component={TodoList} queries={ViewerQueries} />
  </Route>,
);
