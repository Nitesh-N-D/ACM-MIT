import { defineConfig } from "@playwright/test";

/**
 * Acceptance tests: `npm run test:e2e` (after `npm run build`).
 *
 * They run against the production server on port 3123, started here unless
 * one is already running. The browser is the installed Microsoft Edge by
 * default, so nothing has to be downloaded; set PW_CHANNEL=chrome to use
 * Google Chrome, or PW_CHANNEL=chromium after `npx playwright install chromium`.
 * Set E2E_BASE_URL to test another server (a preview deployment, say).
 */
const PORT = 3123;
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;
const channel = process.env.PW_CHANNEL ?? "msedge";

export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "tmp/test-results",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "tmp/playwright-report", open: "never" }],
  ],
  use: {
    baseURL,
    channel: channel === "chromium" ? undefined : channel,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    {
      name: "mobile",
      use: {
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
      grepInvert: /@desktop/,
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npx next start -p ${PORT}`,
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
