const babelPresetEnv = require('babel-preset-env');

const { BABEL_ENV } = process.env;

module.exports = {
  presets: [
    [
      babelPresetEnv,
      {
        loose: true,
        modules: BABEL_ENV === 'es' ? false : 'commonjs',
      },
    ],
  ],
};
