import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from 'graphql';

const Widget = new GraphQLObjectType({
  name: 'Widget',
  fields: {
    name: { type: GraphQLString },
    argValue: {
      type: GraphQLString,
      args: {
        value: { type: GraphQLNonNull(GraphQLString) },
      },
      resolve: (obj, { value }) => value,
    },
  },
});

const query = new GraphQLObjectType({
  name: 'Query',
  fields: {
    // XXX: relay-compiler chokes unless at least one type has an ID.
    id: {
      type: GraphQLID,
      resolve: () => 'query',
    },
    widget: {
      type: Widget,
      resolve: () => ({ name: 'foo' }),
    },
    widgetByArg: {
      type: Widget,
      args: {
        name: { type: GraphQLNonNull(GraphQLString) },
      },
      resolve: (obj, { name }) => ({ name }),
    },
    error: {
      type: GraphQLString,
      resolve: () => {
        throw new Error('expected error');
      },
    },
  },
});

export default new GraphQLSchema({ query });
