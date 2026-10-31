import { defineConfig } from 'vitest/config';

/** Runs the API's tests. In GitHub Actions, the job summary is titled with the workspace. */
export default defineConfig({
  test: {
    reporters: process.env.GITHUB_ACTIONS
      ? ['default', ['github-actions', { jobSummary: { title: 'API tests (apps/api)' } }]]
      : ['default'],
  },
});
