// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm start',
    url: 'http://localhost:3100',
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      ...process.env,
      BROWSER: 'none',
      PORT: '3100',
      REACT_APP_TEST_AUTH: 'mock',
      REACT_APP_USE_EMULATORS: 'true',
      REACT_APP_FIREBASE_PROJECT_ID: 'demo-sunbeth',
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
