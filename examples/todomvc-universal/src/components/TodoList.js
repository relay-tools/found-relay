import PropTypes from 'prop-types';
import React from 'react';
import {
  ReactRelayContext,
  createFragmentContainer,
  graphql,
} from 'react-relay';

import MarkAllTodosMutation from '../mutations/MarkAllTodosMutation';
import Todo from './Todo';

const propTypes = {
  viewer: PropTypes.object.isRequired,
  relay: PropTypes.object.isRequired,
};

const contextType = ReactRelayContext;

class TodoList extends React.Component {
  onToggleAllChange = (e) => {
    const { relay, viewer } = this.props;
    const complete = e.target.checked;

    MarkAllTodosMutation.commit(
      relay.environment,
      viewer,
      complete,
      this.context.variables.status,
    );
  };

  render() {
    const { viewer } = this.props;
    const { todos, numTodos, numCompletedTodos } = viewer;

    if (!numTodos) {
      return null;
    }

    return (
      <section className="main">
        <input
          id="toggle-all"
          type="checkbox"
          checked={numTodos === numCompletedTodos}
          className="toggle-all"
          onChange={this.onToggleAllChange}
        />
        <label htmlFor="toggle-all">Mark all as complete</label>

        <ul className="todo-list">
          {todos.edges.map(({ node }) => (
            <Todo key={node.id} viewer={viewer} todo={node} />
          ))}
        </ul>
      </section>
    );
  }
}

TodoList.propTypes = propTypes;
TodoList.contextType = contextType;

export default createFragmentContainer(TodoList, {
  viewer: graphql`
    fragment TodoList_viewer on User {
      todos(status: $status, first: 2147483647)
        @connection(key: "TodoList_todos") {
        edges {
          node {
            id
            complete
            ...Todo_todo
          }
        }
      }
      id
      numTodos
      numCompletedTodos
      ...Todo_viewer
    }
  `,
});
