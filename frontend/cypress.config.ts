import { defineConfig } from 'cypress';

const toBool = (value: string | undefined) => String(value || '').toLowerCase() === 'true';

export default defineConfig({
  video: false,
  screenshotOnRunFailure: true,
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',
    env: {
      apiBaseUrl: process.env.CYPRESS_API_BASE_URL || 'http://127.0.0.1:5000',
      testEmail: process.env.CYPRESS_TEST_EMAIL || '',
      testPassword: process.env.CYPRESS_TEST_PASSWORD || '',
      testLogin: process.env.CYPRESS_TEST_LOGIN || '',
      testRepoUrl: process.env.CYPRESS_TEST_REPO_URL || '',
      storedRepoId: process.env.CYPRESS_STORED_REPO_ID || '',
      deleteRepoId: process.env.CYPRESS_DELETE_REPO_ID || '',
      runLiveAuthTests: toBool(process.env.CYPRESS_RUN_LIVE_AUTH_TESTS),
      runLiveRepoTests: toBool(process.env.CYPRESS_RUN_LIVE_REPO_TESTS),
      runRepoMutationTests: toBool(process.env.CYPRESS_RUN_REPO_MUTATION_TESTS),
      runLambdaTests: toBool(process.env.CYPRESS_RUN_LAMBDA_TESTS),
      runPrTests: toBool(process.env.CYPRESS_RUN_PR_TESTS),
    },
    setupNodeEvents(_on, config) {
      return config;
    },
  },
});
