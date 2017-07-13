import Relay from 'react-relay/classic';

export default class RemoveCompletedTodosMutation extends Relay.Mutation {
  static fragments = {
    viewer: () => Relay.QL`
      fragment on User {
        id
        numTodos
        numCompletedTodos
      }
    `,

    // TODO: Make edges, numTodos, and numCompletedTodos optional.
    todos: () => Relay.QL`
      fragment on TodoConnection {
        edges {
          node {
            id
            complete
          }
        }
      }
    `,
  };

  getMutation() {
    return Relay.QL`mutation{ removeCompletedTodos }`;
  }

  getFatQuery() {
    return Relay.QL`
      fragment on RemoveCompletedTodosPayload {
        viewer {
          numTodos
          numCompletedTodos
        }
        deletedIds
      }
    `;
  }

  getConfigs() {
    return [{
      type: 'NODE_DELETE',
      parentName: 'viewer',
      parentID: this.props.viewer.id,
      connectionName: 'todos',
      deletedIDFieldName: 'deletedIds',
    }];
  }

  getVariables() {
    return {};
  }

  getOptimisticResponse() {
    const { viewer, todos } = this.props;

    const { numTodos, numCompletedTodos } = viewer;
    let newNumTodos;
    if (numTodos != null && numCompletedTodos != null) {
      newNumTodos = numTodos - numCompletedTodos;
    }

    let deletedIds;
    if (todos) {
      if (todos.edges) {
        deletedIds = todos.edges
          .filter(({ node }) => node.complete)
          .map(({ node }) => node.id);
      }
    }

    return {
      viewer: {
        id: viewer.id,
        numTodos: newNumTodos,
        numCompletedTodos: 0,
      },
      deletedIds,
    };
  }
}
