import js from '@eslint/js'
import tseslint, { parser as tsParser } from 'typescript-eslint'
import { defineConfig } from 'eslint/config'
import astro from 'eslint-plugin-astro'
import tailwindcss from 'eslint-plugin-tailwindcss'

export default defineConfig([
  {
    ignores: ['.astro/', 'dist/', 'pnpm-lock.yaml', 'node_modules/']
  },
  // Base config: all files get recommended rules
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
    languageOptions: {
      parserOptions: { parser: tsParser, extraFileExtensions: ['.astro'] }
    }
  },
  // Feature isolation: only features/ cannot import from sibling features.
  // shared/ and views/ are allowed to import from features — they exist to
  // compose, reuse, and orchestrate across feature boundaries.
  {
    files: ['src/features/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@features/*'],
              message: 'Features cannot import from other features. Use @shared instead.'
            },
            {
              group: ['../sounds/**', '../paths/**', '../sound-pieces/**'],
              message: 'Features cannot import from sibling features via relative paths. Use @shared instead.'
            }
          ]
        }
      ]
    }
  }
])