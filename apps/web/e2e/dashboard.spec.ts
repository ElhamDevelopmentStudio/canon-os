import { test, expect } from "./helpers/fixtures";
import { registerViaUi } from "./helpers/auth";
import { allowApiFailure, allowConsoleError, expectApiJson, waitForApiResponse } from "./helpers/network";

test.describe("dashboard browser-to-backend flow", () => {
  test("loads authenticated dashboard summary", async ({ page }) => {
    await registerViaUi(page);

    const summaryResponse = waitForApiResponse(page, "GET", "/api/dashboard/summary/", 200);
    await page.goto("/");
    const summary = await expectApiJson<{ counts: { totalMedia: number } }>(await summaryResponse);

    expect(summary.counts.totalMedia).toBeGreaterThanOrEqual(0);
    await expect(page.getByText("Total library")).toBeVisible();
    await expect(page.getByText("Media type breakdown")).toBeVisible();
  });

  test("shows dashboard error state for an expected backend failure", async ({ page }) => {
    await registerViaUi(page);
    allowApiFailure(page, { method: "GET", path: "/api/dashboard/summary/", status: 503 });
    allowConsoleError(page, "Failed to load resource: the server responded with a status of 503");
    await page.route("**/api/dashboard/summary/", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ detail: "E2E forced dashboard failure" }),
      });
    });

    await page.goto("/");

    await expect(page.getByText("Dashboard unavailable")).toBeVisible();
    await expect(page.getByText("E2E forced dashboard failure")).toBeVisible();
  });
});
