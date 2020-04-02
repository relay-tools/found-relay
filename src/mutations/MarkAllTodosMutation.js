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

function commit(environment, user, complete, status) {
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

      connection.getLinkedRecords('edges').forEach((edge) => {
        edge.getLinkedRecord('node').setValue(complete, 'complete');
      });

      userProxy.setValue(
        complete ? userProxy.getValue('numTodos') : 0,
        'numCompletedTodos',
      );
    },
  });
}

export default { commit };
