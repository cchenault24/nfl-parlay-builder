import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  // Base JavaScript recommendations
  js.configs.recommended,

  // TypeScript configurations
  ...tseslint.configs.recommended,

  // Main configuration
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.node,
        ...globals.es2020,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',

      // General JavaScript/TypeScript rules
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-debugger': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-template': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      curly: ['error', 'all'],
      'no-else-return': 'error',
      'prefer-arrow-callback': 'error',

      // Import/Export rules
      'no-duplicate-imports': 'error',
      'no-case-declarations': 'error',
    },
  },

  // Config files exceptions
  {
    files: ['*.config.{js,ts,mjs,mts}', 'eslint.config.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // Test files exceptions (if you add tests later)
  {
    files: ['**/*.test.{js,ts}', '**/*.spec.{js,ts}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },

  // Ignore patterns
  {
    ignores: [
      'lib/',
      'node_modules/',
      '*.min.js',
      '.firebase/',
      'coverage/',
    ],
  }
)
