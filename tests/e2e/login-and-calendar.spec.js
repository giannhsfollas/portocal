const { test, expect } = require("@playwright/test");

test("login and calendar page loads", async ({ page }) => {
  await page.goto("/login");

  await page.fill("#username", "dev");
  await page.fill("#password", "dev");
  await page.click('button[type="submit"]');

  // After login we should end up on the main page (calendar UI).
  await page.waitForURL(/(\/$|\/index)/, { timeout: 30_000 }).catch(() => {});

  // Calendar grid exists even before events load.
  await expect(page.locator("#calendarGrid")).toBeVisible();
  await expect(page.locator("#monthTitle")).not.toHaveText("");

  // The JS renders day cells for the current month.
  await expect(page.locator("#calendarGrid .day-cell").first()).toBeVisible();
});

