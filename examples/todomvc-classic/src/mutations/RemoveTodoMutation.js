import Relay from 'react-relay/classic';

export default class RemoveTodoMutation extends Relay.Mutation {
  static fragments = {
    // TODO: Mark numTodos and numCompletedTodos as optional.
    viewer: () => Relay.QL`
      fragment on User {
        id
        numTodos
        numCompletedTodos
      }
    `,

    // TODO: Mark complete as optional.
    todo: () => Relay.QL`
      fragment on Todo {
        id
        complete
      }
    `,
  };

  getMutation() {
    return Relay.QL`mutation{ removeTodo }`;
  }

  getFatQuery() {
    return Relay.QL`
      fragment on RemoveTodoPayload {
        viewer {
          numTodos
          numCompletedTodos
        }
        deletedId
      }
    `;
  }

  getConfigs() {
    return [{
      type: 'NODE_DELETE',
      parentName: 'viewer',
      parentID: this.props.viewer.id,
      connectionName: 'todos',
      deletedIDFieldName: 'deletedId',
    }];
  }

  getVariables() {
    return {
      id: this.props.todo.id,
    };
  }

  getOptimisticResponse() {
    const { viewer, todo } = this.props;
    const viewerPayload = { id: viewer.id };

    const { numTodos, numCompletedTodos } = viewer;
    if (numTodos != null) {
      viewerPayload.numTodos = numTodos - 1;
    }
    if (numCompletedTodos != null) {
      viewerPayload.numCompletedTodos =
        numCompletedTodos - (todo.complete ? 1 : 0);
    }

    return {
      viewer: viewerPayload,
      deletedId: todo.id,
    };
  }
}
