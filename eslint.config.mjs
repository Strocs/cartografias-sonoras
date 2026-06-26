import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';
import astro from 'eslint-plugin-astro';
import tailwindcss from 'eslint-plugin-tailwindcss';

export default defineConfig([
  {
    ignores: ['.astro/', 'dist/', 'pnpm-lock.yaml']
  },
  {
    files: ['**/*.{js,jsx,ts,tsx,astro}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      tailwindcss.configs.recommended,
      astro.configs.recommended
    ],
    settings: {
      tailwindcss: {
        cssConfigPath: 'src/styles/global.css'
      }
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@features/*'],
              message:
                'Features cannot import from other features. Use @shared instead.'
            }
          ]
        }
      ]
    }
  }
]);
