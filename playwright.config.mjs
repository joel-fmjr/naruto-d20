import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the naruto-d20 automated QA suite.
 *
 * The suite drives a LIVE Foundry instance (default http://localhost:30000)
 * running a test world with the `naruto-d20` module active and the configured
 * template actor. The harness installs its API explicitly and clones that actor
 * for every test, leaving the original world data untouched.
 *
 * Foundry is a single shared, stateful world — tests MUST NOT run in parallel.
 */
const BASE_URL = process.env.FOUNDRY_URL ?? "http://localhost:30000";

export default defineConfig({
  testDir: "tests/e2e/specs",
  globalSetup: "./tests/e2e/global-setup.mjs",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    storageState: "tests/e2e/.auth/state.json",
    actionTimeout: 15_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "foundry",
      // Desktop Chrome defaults to 1280x720, below Foundry's 1366x768 minimum;
      // the permanent "screen resolution" notification then intercepts clicks.
      use: { ...devices["Desktop Chrome"], viewport: { width: 1920, height: 1080 } },
    },
  ],
});
