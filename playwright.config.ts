import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for lightweight E2E checks against a running preview.
 *
 * Set `E2E_BASE_URL` to point at your preview/prod URL, and
 * `E2E_PROFILE_USERNAME` to an existing public profile to run the
 * profile-tile dedupe test. Without those envs the profile spec is skipped.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://lamsa.live",
    trace: "on-first-retry",
  },
  projects: [
    { name: "mobile",  use: { ...devices["iPhone 12"] } },
    { name: "tablet",  use: { ...devices["iPad (gen 7)"] } },
    { name: "desktop", use: { viewport: { width: 1280, height: 900 } } },
  ],
});
