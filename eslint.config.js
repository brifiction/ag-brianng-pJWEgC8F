/** SonarJS rules only; formatting and general linting are owned by Biome. */
import { defineConfig } from 'eslint/config';
import sonarjs from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['**/dist/**', '**/.turbo/**', '**/coverage/**', 'apps/web/src/components/ui/**'] },
  {
    files: ['apps/*/src/**/*.{ts,tsx}', 'packages/**/src/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    extends: [sonarjs.configs.recommended],
    rules: {
      'sonarjs/cognitive-complexity': ['error', 10],
    },
  },
);
