import Link from 'found/lib/Link';
import PropTypes from 'prop-types';
import React from 'react';
import Relay from 'react-relay/classic';

import RemoveCompletedTodosMutation
  from '../mutations/RemoveCompletedTodosMutation';

const propTypes = {
  viewer: PropTypes.object.isRequired,
  relay: PropTypes.object.isRequired,
};

class TodoListFooter extends React.Component {
  onClearCompletedClick = () => {
    const { relay, viewer } = this.props;
    const { todos } = viewer;

    relay.commitUpdate(
      new RemoveCompletedTodosMutation({ viewer, todos }),
    );
  };

  renderRemaining() {
    const { numTodos } = this.props.viewer;

    return (
      <span className="todo-count">
        <strong>
          {numTodos}
        </strong> {numTodos === 1 ? 'item' : 'items'} left
      </span>
    );
  }

  renderClearCompleted() {
    if (!this.props.viewer.numCompletedTodos) {
      return null;
    }

    return (
      <button
        className="clear-completed"
        onClick={this.onClearCompletedClick}
      >
        Clear completed
      </button>
    );
  }

  render() {
    if (!this.props.viewer.numTodos) {
      return null;
    }

    return (
      <footer className="footer">
        {this.renderRemaining()}

        <ul className="filters">
          <li>
            <Link to="/" activeClassName="selected" exact>All</Link>
          </li>
          <li>
            <Link to="/active" activeClassName="selected">Active</Link>
          </li>
          <li>
            <Link to="/completed" activeClassName="selected">Completed</Link>
          </li>
        </ul>

        {this.renderClearCompleted()}
      </footer>
    );
  }
}

TodoListFooter.propTypes = propTypes;

export default Relay.createContainer(TodoListFooter, {
  initialVariables: {
    limit: -1 >>> 1, // eslint-disable-line no-bitwise
  },

  fragments: {
    viewer: () => Relay.QL`
      fragment on User {
        todos(status: "completed", first: $limit) {
          ${RemoveCompletedTodosMutation.getFragment('todos')}
        }
        numTodos
        numCompletedTodos
        ${RemoveCompletedTodosMutation.getFragment('viewer')}
      }
    `,
  },
});
