import { defineConfig, devices } from '@playwright/test';

// Admin golden path (H80). Against a deployed admin: ADMIN_E2E_URL=https://... npm run test:e2e
// Without it, a local `next dev -p 3100` is started (see e2e/README.md).
const external = process.env.ADMIN_E2E_URL;
const baseURL = external || 'http://127.0.0.1:3100';

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: external
    ? undefined
    : {
        command: 'npx next dev -p 3100',
        url: 'http://127.0.0.1:3100/login',
        reuseExistingServer: true,
        timeout: 300_000,
      },
});
