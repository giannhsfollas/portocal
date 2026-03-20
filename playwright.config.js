/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:5000",
    // Keep tests stable in headless/CI.
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: "python run.py",
    url: "http://127.0.0.1:5000/",
    reuseExistingServer: true,
    timeout: 120_000,
  },
};

module.exports = config;

