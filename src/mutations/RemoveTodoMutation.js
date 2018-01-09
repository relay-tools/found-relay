import { commitMutation, graphql } from 'react-relay';
import { ConnectionHandler } from 'relay-runtime';

const mutation = graphql`
  mutation RemoveTodoMutation($input: RemoveTodoInput!) {
    removeTodo(input: $input) {
      viewer {
        numTodos
        numCompletedTodos
      }
      deletedId
    }
  }
`;

function sharedUpdater(store, user, deletedId) {
  const userProxy = store.get(user.id);

  ['any', 'active', 'completed'].forEach(status => {
    const connection = ConnectionHandler.getConnection(
      userProxy,
      'TodoList_todos',
      { status },
    );
    if (connection) {
      ConnectionHandler.deleteNode(connection, deletedId);
    }
  });
}

function commit(environment, user, todo) {
  return commitMutation(environment, {
    mutation,
    variables: {
      input: { id: todo.id },
    },

    updater(store) {
      const payload = store.getRootField('removeTodo');
      sharedUpdater(store, user, payload.getValue('deletedId'));
    },

    optimisticUpdater(store) {
      sharedUpdater(store, user, todo.id);

      const userProxy = store.get(user.id);
      const numTodos = userProxy.getValue('numTodos');
      if (numTodos != null) {
        userProxy.setValue(numTodos - 1, 'numTodos');
      }
      const numCompletedTodos = userProxy.getValue('numCompletedTodos');
      if (numCompletedTodos != null) {
        if (todo.complete != null) {
          if (todo.complete) {
            userProxy.setValue(numCompletedTodos - 1, 'numCompletedTodos');
          }
        } else if (numTodos != null) {
          // Note this is the old numTodos.
          if (numTodos - 1 < numCompletedTodos) {
            userProxy.setValue(numTodos - 1, 'numCompletedTodos');
          }
        }
      }
    },
  });
}

export default { commit };
