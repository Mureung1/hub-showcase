import js from '@eslint/js'
import globals from 'globals'
import eslintConfigPrettier from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['node_modules', 'generated']),
  {
    files: ['**/*.js'],
    extends: [js.configs.recommended, eslintConfigPrettier],
    languageOptions: {
      sourceType: 'module',
      globals: globals.node,
    },
  },
])
