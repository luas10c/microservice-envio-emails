module.exports = {
  env: {
    es2021: true
  },
  extends: ['prettier'],
  plugins: ['prettier'],
  parser: '@typescript-eslint/parser',
  rules: {
    'prettier/prettier': 'error'
  }
}
