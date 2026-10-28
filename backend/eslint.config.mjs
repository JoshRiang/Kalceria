import { defineConfig, globalIgnores } from 'eslint/config';

const nodeGlobals = {
  AbortController: 'readonly',
  Buffer: 'readonly',
  console: 'readonly',
  fetch: 'readonly',
  global: 'readonly',
  globalThis: 'readonly',
  process: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  URL: 'readonly',
};

const commonRules = {
  'no-constant-condition': 'error',
  'no-dupe-keys': 'error',
  'no-unreachable': 'error',
  'no-unused-vars': ['error', {
    argsIgnorePattern: '^_',
    caughtErrorsIgnorePattern: '^_',
    varsIgnorePattern: '^_',
  }],
  'no-undef': 'error',
};

export default defineConfig([
  globalIgnores(['node_modules/**', 'coverage/**', 'dist/**', 'prisma/generated/**']),
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: nodeGlobals,
    },
    rules: commonRules,
  },
  {
    files: ['**/*.cjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: { ...nodeGlobals, exports: 'readonly', module: 'readonly', require: 'readonly' },
    },
    rules: commonRules,
  },
]);
