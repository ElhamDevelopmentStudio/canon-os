import type { Page } from "@playwright/test";

import { test, expect } from "./helpers/fixtures";
import { registerViaUi } from "./helpers/auth";
import { uniqueTitle } from "./helpers/data";
import { expectApiJson, waitForApiResponse } from "./helpers/network";

async function createScoredMedia(page: Page, title: string) {
  await page.goto("/library");
  await page.getByRole("button", { name: "Add Media" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Add media" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Title", { exact: true }).fill(title);
  await dialog.getByLabel("Creator / director / author").fill("TasteGraph Director");
  await dialog.getByLabel("Status").selectOption({ label: "Completed" });
  await dialog.getByLabel("Media type").selectOption({ label: "Movie" });
  await dialog.getByLabel("Personal rating").fill("9.1");
  await dialog.getByText("Atmosphere").scrollIntoViewIfNeeded();
  const scores = dialog.getByRole("spinbutton", { name: "Score" });
  await scores.nth(0).fill("8.0");
  await scores.nth(2).fill("9.4");
  await scores.nth(11).fill("1.0");

  const createResponse = waitForApiResponse(page, "POST", "/api/media-items/", 201);
  const scoreResponse = waitForApiResponse(page, "PUT", /\/api\/media-items\/[^/]+\/scores\/$/, 200);
  await dialog.getByRole("button", { name: "Save media" }).click();
  await createResponse;
  await scoreResponse;
  await expect(page.getByRole("link", { name: title })).toBeVisible();
}

test.describe("TasteGraph browser-to-backend flow", () => {
  test("rebuilds the graph from scored media and shows connected signals", async ({ page }) => {
    await registerViaUi(page);

    const emptySummaryResponse = waitForApiResponse(page, "GET", "/api/taste-graph/summary/", 200);
    await page.goto("/taste-graph");
    const emptySummary = await expectApiJson<{ isEmpty: boolean }>(await emptySummaryResponse);
    expect(emptySummary.isEmpty).toBe(true);
    await expect(page.getByText("TasteGraph has no connections yet")).toBeVisible();

    const title = uniqueTitle("E2E TasteGraph Media");
    await createScoredMedia(page, title);

    const summaryBeforeRebuild = waitForApiResponse(page, "GET", "/api/taste-graph/summary/", 200);
    await page.goto("/taste-graph");
    await summaryBeforeRebuild;
    const rebuildResponse = waitForApiResponse(page, "POST", "/api/taste-graph/rebuild/", 201);
    const refreshedSummaryResponse = waitForApiResponse(page, "GET", "/api/taste-graph/summary/", 200);
    await page.getByRole("button", { name: "Rebuild TasteGraph" }).first().click();
    const job = await expectApiJson<{ status: string; nodeCount: number; edgeCount: number }>(await rebuildResponse);
    expect(job.status).toBe("completed");
    expect(job.nodeCount).toBeGreaterThan(0);
    expect(job.edgeCount).toBeGreaterThan(0);
    const summary = await expectApiJson<{ isEmpty: boolean; strongestCreators: { label: string }[] }>(await refreshedSummaryResponse);
    expect(summary.isEmpty).toBe(false);
    expect(summary.strongestCreators.some((creator) => creator.label === "TasteGraph Director")).toBe(true);

    const rebuildStatus = page.getByLabel("TasteGraph rebuild status");
    await expect(rebuildStatus.getByRole("heading", { name: "TasteGraph rebuild" })).toBeVisible();
    await expect(rebuildStatus.getByLabel("Complete, success status")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Strongest connected creators" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "TasteGraph Director" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Text graph view" })).toBeVisible();
  });
});
