import Relay from 'react-relay/classic';

export default class AddTodoMutation extends Relay.Mutation {
  static fragments = {
    viewer: () => Relay.QL`
      fragment on User {
        id
        numTodos
      }
    `,
  };

  getMutation() {
    return Relay.QL`mutation{ addTodo }`;
  }

  getFatQuery() {
    return Relay.QL`
      fragment on AddTodoPayload @relay(pattern: true) {
        viewer {
          todos
          numTodos
        }
        todoEdge
      }
    `;
  }

  getConfigs() {
    return [{
      type: 'RANGE_ADD',
      parentName: 'viewer',
      parentID: this.props.viewer.id,
      connectionName: 'todos',
      edgeName: 'todoEdge',
      rangeBehaviors: ({ status }) => (
        status === 'completed' ? 'ignore' : 'append'
      ),
    }];
  }

  getVariables() {
    return {
      text: this.props.text,
    };
  }

  getOptimisticResponse() {
    const { viewer, text } = this.props;

    return {
      viewer: {
        id: viewer.id,
        numTodos: viewer.numTodos + 1,
      },

      // FIXME: numTodos gets updated optimistically, but this edge does not
      // get added until the server responds.
      todoEdge: {
        node: {
          complete: false,
          text,
        },
      },
    };
  }
}
