import { defineConfig, devices } from "@playwright/test"

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3001"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }], ["json", { outputFile: "playwright-report/results.json" }]]
    : "html",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    // Runs first: logs in once and writes the authed storageState to disk.
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      // Skip the setup file here; it runs in the "setup" project above.
      testIgnore: /.*\.setup\.ts/,
      // Ensure the storageState exists before any authed spec runs.
      dependencies: ["setup"],
    },
  ],
})
