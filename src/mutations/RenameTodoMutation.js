import { commitMutation, graphql } from 'react-relay';

const mutation = graphql`
  mutation RenameTodoMutation($input: RenameTodoInput!) {
    renameTodo(input: $input) {
      todo {
        id
        text
      }
    }
  }
`;

function commit(environment, todo, text) {
  return commitMutation(environment, {
    mutation,
    variables: {
      input: { id: todo.id, text },
    },

    optimisticResponse() {
      return {
        renameTodo: {
          todo: {
            id: todo.id,
            text,
          },
        },
      };
    },
  });
}

export default { commit };
