import Link from 'found/lib/Link';
import PropTypes from 'prop-types';
import React from 'react';
import { createFragmentContainer, graphql } from 'react-relay';

import RemoveCompletedTodosMutation from '../mutations/RemoveCompletedTodosMutation';

const propTypes = {
  viewer: PropTypes.object.isRequired,
  relay: PropTypes.object.isRequired,
};

class TodoListFooter extends React.Component {
  onClearCompletedClick = () => {
    const { relay, viewer } = this.props;
    const { todos } = viewer;

    RemoveCompletedTodosMutation.commit(relay.environment, viewer, todos);
  };

  render() {
    const { numTodos, numCompletedTodos } = this.props.viewer;
    if (!this.props.viewer.numTodos) {
      return null;
    }

    return (
      <footer className="footer">
        <span className="todo-count">
          <strong>{numTodos}</strong> {numTodos === 1 ? 'item' : 'items'} left
        </span>

        <ul className="filters">
          <li>
            <Link to="/" activeClassName="selected" exact>
              All
            </Link>
          </li>
          <li>
            <Link to="/active" activeClassName="selected">
              Active
            </Link>
          </li>
          <li>
            <Link to="/completed" activeClassName="selected">
              Completed
            </Link>
          </li>
        </ul>

        {!!numCompletedTodos && (
          <button
            className="clear-completed"
            onClick={this.onClearCompletedClick}
          >
            Clear completed
          </button>
        )}
      </footer>
    );
  }
}

TodoListFooter.propTypes = propTypes;

export default createFragmentContainer(
  TodoListFooter,
  graphql`
    fragment TodoListFooter_viewer on User {
      todos(status: "completed", first: 2147483647) {
        edges {
          node {
            id
            complete
          }
        }
      }
      id
      numTodos
      numCompletedTodos
    }
  `,
);
