import { commitMutation, graphql } from 'react-relay';
import { ConnectionHandler } from 'relay-runtime';

const mutation = graphql`
  mutation MarkAllTodosMutation($input: MarkAllTodosInput!, $status: String!) {
    markAllTodos(input: $input) {
      viewer {
        todos(status: $status) {
          edges {
            node {
              id
              complete
              text
            }
          }
        }
        id
        numCompletedTodos
      }
      changedTodos {
        id
        complete
      }
    }
  }
`;

function commit(environment, user, todos, complete, status) {
  return commitMutation(environment, {
    mutation,
    variables: {
      input: { complete },
      status,
    },

    updater(store) {
      const userProxy = store.get(user.id);
      const connection = ConnectionHandler.getConnection(
        userProxy,
        'TodoList_todos',
        { status },
      );
      const todoEdges = store
        .getRootField('markAllTodos')
        .getLinkedRecord('viewer')
        .getLinkedRecord('todos', { status })
        .getLinkedRecords('edges');
      connection.setLinkedRecords(todoEdges, 'edges');
    },

    optimisticUpdater(store) {
      const userProxy = store.get(user.id);
      const connection = ConnectionHandler.getConnection(
        userProxy,
        'TodoList_todos',
        { status },
      );

      if (
        (complete && status === 'active') ||
        (!complete && status === 'completed')
      ) {
        connection.setLinkedRecords([], 'edges');
      }
    },

    optimisticResponse() {
      const payload = {
        viewer: {
          id: user.id,
        },
      };

      if (todos && todos.edges) {
        payload.changedTodos = todos.edges
          .filter(({ node }) => node.complete !== complete)
          .map(({ node }) => ({ id: node.id, complete }));
      }

      if (complete) {
        if (user.numTodos != null) {
          payload.viewer.numCompletedTodos = user.numTodos;
        }
      } else {
        payload.viewer.numCompletedTodos = 0;
      }

      return {
        markAllTodos: payload,
      };
    },
  });
}

export default { commit };
