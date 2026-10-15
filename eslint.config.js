import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/node_modules/**',
      '**/.venv/**',
      '**/.pytest_cache/**',
      '**/coverage/**',
      '**/*.tsbuildinfo',
      'apps/dashboard/vite.config.js',
      'apps/dashboard/vite.config.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2026,
      },
    },
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
);
