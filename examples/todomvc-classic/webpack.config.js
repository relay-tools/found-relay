const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

const production = process.env.NODE_ENV === 'production';

module.exports = {
  entry: ['babel-polyfill', './src/client'],

  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'bundle.js',
  },

  module: {
    rules: [
      { test: /\.js$/, exclude: /node_modules/, use: 'babel-loader' },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      { test: /learn\.json$/, use: 'file-loader?name=[name].[ext]' },
    ],
  },

  plugins: [
    new HtmlWebpackPlugin({
      title: 'Relay • TodoMVC',
    }),
  ],

  devtool: production ? 'source-map' : 'module-source-map',

  devServer: {
    historyApiFallback: true,
  },
};
