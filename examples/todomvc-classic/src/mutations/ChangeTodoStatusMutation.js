import Relay from 'react-relay/classic';

export default class ChangeTodoStatusMutation extends Relay.Mutation {
  static fragments = {
    // TODO: Mark numCompletedTodos optional.
    viewer: () => Relay.QL`
      fragment on User {
        id
        numCompletedTodos
      }
    `,

    todo: () => Relay.QL`
      fragment on Todo {
        id
      }
    `,
  };

  getMutation() {
    return Relay.QL`mutation{ changeTodoStatus }`;
  }

  getFatQuery() {
    return Relay.QL`
      fragment on ChangeTodoStatusPayload @relay(pattern: true) {
        viewer {
          todos
          numCompletedTodos
        }
        todo {
          complete
        }
      }
    `;
  }

  getConfigs() {
    return [{
      type: 'FIELDS_CHANGE',
      fieldIDs: {
        viewer: this.props.viewer.id,
        todo: this.props.todo.id,
      },
    }];
  }

  getVariables() {
    return {
      id: this.props.todo.id,
      complete: this.props.complete,
    };
  }

  getOptimisticResponse() {
    const { viewer, todo, complete } = this.props;
    const viewerPayload = { id: viewer.id };

    const { numCompletedTodos } = viewer;
    if (numCompletedTodos != null) {
      viewerPayload.numCompletedTodos =
        numCompletedTodos + (complete ? 1 : -1);
    }

    return {
      viewer: viewerPayload,
      todo: {
        id: todo.id,
        complete,
      },
    };
  }
}
