module.exports = {
  extends: [
    '4catalyzer-react',
    '4catalyzer-typescript',
    '4catalyzer-jest',
    'prettier',
  ],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error',
  },
};
