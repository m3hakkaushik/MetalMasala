export default [
  {
    ignores: ['node_modules/**', 'data/**', 'logs/**'],
  },
  {
    files: ['**/*.js', '**/*.cjs'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^(next|_)' }],
      'no-undef': 'off',
    },
  },
];
