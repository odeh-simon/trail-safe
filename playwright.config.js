import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './src/tests/e2e',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    permissions: ['geolocation'],
    geolocation: { latitude: -25.7479, longitude: 28.2293 },
  },
  timeout: 60000,
  projects: [{ name: 'chromium', use: { ...devices['Pixel 5'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
});
