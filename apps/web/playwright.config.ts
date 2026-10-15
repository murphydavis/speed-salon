import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.WEB_ORIGIN ?? "http://localhost:5173";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "smoke.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 30_000 },
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    viewport: { width: 960, height: 540 },
    trace: "off",
    video: "off",
  },
  webServer: {
    command: "npm run dev --prefix ../..",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
