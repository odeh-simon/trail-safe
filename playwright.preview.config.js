/**
 * E2E tests against production build (vite preview).
 * Use when dev server has PostCSS issues: npm run test:e2e:preview
 */
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./src/tests/e2e",
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
    permissions: ["geolocation"],
    geolocation: { latitude: -25.7479, longitude: 28.2293 },
  },
  timeout: 60000,
  projects: [{ name: "chromium", use: { ...devices["Pixel 5"] } }],
  webServer: {
    command: "npm run build && npm run preview",
    url: "http://localhost:4173",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
