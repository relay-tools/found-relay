import Relay from 'react-relay/classic';

export default class MarkAllTodosMutation extends Relay.Mutation {
  static fragments = {
    viewer: () => Relay.QL`
      fragment on User {
        id
        numTodos
      }
    `,

    // TODO: Mark edges and numTodos optional.
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
    return Relay.QL`mutation{ markAllTodos }`;
  }

  getFatQuery() {
    return Relay.QL`
      fragment on MarkAllTodosPayload @relay(pattern: true) {
        viewer {
          todos
          numCompletedTodos
        }
      }
    `;
  }

  getConfigs() {
    return [
      {
        type: 'FIELDS_CHANGE',
        fieldIDs: {
          viewer: this.props.viewer.id,
        },
      },
    ];
  }

  getVariables() {
    return {
      complete: this.props.complete,
    };
  }

  getOptimisticResponse() {
    const { viewer, todos, complete } = this.props;
    const viewerPayload = { id: viewer.id };

    if (todos && todos.edges) {
      viewerPayload.todos = {
        edges: todos.edges
          .filter(({ node }) => node.complete !== complete)
          .map(({ node }) => ({
            node: {
              id: node.id,
              complete,
            },
          })),
      };
    }

    const { totalCount } = viewer;
    if (totalCount != null) {
      viewerPayload.completedCount = complete ? totalCount : 0;
    }

    return {
      viewer: viewerPayload,
    };
  }
}
