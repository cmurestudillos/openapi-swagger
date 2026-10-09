'use strict';

const js = require('@eslint/js');
const globals = require('globals');
const prettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = [
  {
    ignores: ['node_modules/**', 'release/**', 'dist/**', 'docs/**'],
  },
  js.configs.recommended,
  prettierRecommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'warn',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      eqeqeq: ['error', 'always'],
      curly: 'error',
    },
  },
  // Scripts del renderer: se cargan con <script> en index.html (APIs del navegador + librerías UMD)
  {
    files: ['renderer.js', 'swagger-parser-loader.js'],
    languageOptions: {
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ace: 'readonly',
        jsyaml: 'readonly',
        SwaggerUIBundle: 'readonly',
        SwaggerParser: 'readonly',
      },
    },
  },
];
