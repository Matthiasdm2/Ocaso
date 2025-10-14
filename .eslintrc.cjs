module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['@typescript-eslint','import','simple-import-sort','unused-imports'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'next/core-web-vitals',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier',
  ],
  rules: {
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'simple-import-sort/imports': 'warn',
    'simple-import-sort/exports': 'warn',
    'import/no-unresolved': 'error',
    '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
  },
  settings: {
    'import/resolver': { typescript: {}, node: { extensions: ['.js','.jsx','.ts','.tsx'] } },
  },
  ignorePatterns: ['node_modules/','.next/','out/','dist/','coverage/','debug-production-detailed.js','diagnose-listing.js','test-production-api.js','test-production-listing.js','test-production-page.js','public/chat-diagnostic.js','app/profile/(tabs)/business/page.tsx'],
};
