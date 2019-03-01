const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = (env, { mode }) => ({
  entry: ['babel-polyfill', './src/client'],

  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'bundle.js',
  },

  module: {
    rules: [
      // See https://github.com/aws/aws-amplify/issues/686#issuecomment-387710340.
      {
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto',
      },
      { test: /\.js$/, exclude: /node_modules/, use: 'babel-loader' },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
    ],
  },

  plugins: [
    new HtmlWebpackPlugin({
      title: 'Relay • TodoMVC',
    }),
    new CopyWebpackPlugin(['src/assets']),
  ],

  devtool: mode === 'production' ? 'source-map' : 'cheap-module-source-map',
});
