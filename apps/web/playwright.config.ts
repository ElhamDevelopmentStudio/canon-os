import { defineConfig, devices } from "@playwright/test";

const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_SERVERS === "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  outputDir: "../../tmp/playwright-results",
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command:
        'node ../../scripts/run-with-root-env.mjs bash -lc "cd apps/api && python3 scripts/ensure_venv.py && .venv/bin/python manage.py migrate --noinput && .venv/bin/python manage.py runserver 0.0.0.0:8000"',
      url: "http://localhost:8000/api/health/",
      reuseExistingServer,
      timeout: 120_000,
    },
    {
      command: "node ../../scripts/run-with-root-env.mjs corepack pnpm --filter @canonos/web run dev",
      url: "http://localhost:5173",
      reuseExistingServer,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
