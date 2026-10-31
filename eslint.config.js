/** ESLint runs SonarJS and TypeDoc checks only; formatting and general linting are owned by Biome. */
import { defineConfig } from 'eslint/config';
import jsdoc from 'eslint-plugin-jsdoc';
import sonarjs from 'eslint-plugin-sonarjs';
import tsdoc from 'eslint-plugin-tsdoc';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['**/dist/**', '**/.turbo/**', '**/coverage/**', 'apps/web/src/components/ui/**'] },
  {
    files: ['apps/*/src/**/*.{ts,tsx}', 'packages/**/src/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { tsdoc },
    extends: [sonarjs.configs.recommended, jsdoc.configs['flat/recommended-typescript-error']],
    rules: {
      'sonarjs/cognitive-complexity': ['error', 10],
      /** Valid TypeDoc (TSDoc) syntax only, e.g. no `@description`. */
      'tsdoc/syntax': 'error',
      /** Document every named function, including arrow functions, with a summary. */
      'jsdoc/require-jsdoc': ['error', { require: { ArrowFunctionExpression: true } }],
      'jsdoc/require-description': 'error',
      /** One `@param props` for destructured props, not one per field. */
      'jsdoc/require-param': ['error', { checkDestructured: false }],
      'jsdoc/check-param-names': ['error', { checkDestructured: false }],
    },
  },
);
