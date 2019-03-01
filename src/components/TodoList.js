import PropTypes from 'prop-types';
import React from 'react';
import { createFragmentContainer, graphql } from 'react-relay';

import MarkAllTodosMutation from '../mutations/MarkAllTodosMutation';
import Todo from './Todo';

const propTypes = {
  viewer: PropTypes.object.isRequired,
  relay: PropTypes.object.isRequired,
};

const contextTypes = {
  relay: PropTypes.shape({
    variables: PropTypes.shape({
      status: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
};

class TodoList extends React.Component {
  onToggleAllChange = e => {
    const { relay, viewer } = this.props;
    const { variables } = this.context.relay;
    const complete = e.target.checked;

    MarkAllTodosMutation.commit(
      relay.environment,
      viewer,
      viewer.todos,
      complete,
      variables.status,
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
TodoList.contextTypes = contextTypes;

export default createFragmentContainer(
  TodoList,
  graphql`
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
);
