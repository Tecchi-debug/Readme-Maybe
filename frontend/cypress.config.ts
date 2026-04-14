import { defineConfig } from 'cypress';

export default defineConfig({
  video: false,
  screenshotOnRunFailure: false,
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',
    env: {
      apiBaseUrl: process.env.CYPRESS_API_BASE_URL || 'http://127.0.0.1:5050',
      testRepoUrl: process.env.CYPRESS_TEST_REPO_URL || '',
    },
    setupNodeEvents(_on, config) {
      return config;
    },
  },
});
