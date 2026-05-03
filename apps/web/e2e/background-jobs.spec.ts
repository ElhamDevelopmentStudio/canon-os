import type { Page } from "@playwright/test";

import { test, expect } from "./helpers/fixtures";
import { registerViaUi } from "./helpers/auth";
import { uniqueTitle } from "./helpers/data";
import { expectApiJson, waitForApiResponse } from "./helpers/network";

async function createMedia(page: Page, title: string) {
  await page.goto("/library");
  await page.getByRole("button", { name: "Add Media" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Add media" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Title", { exact: true }).fill(title);
  await dialog.getByLabel("Creator / director / author").fill("Background Job Director");
  await dialog.getByLabel("Media type").selectOption({ label: "Movie" });
  await dialog.getByLabel("Status").selectOption({ label: "Completed" });
  await dialog.getByLabel("Personal rating").fill("8.7");
  await dialog.getByLabel("Notes").fill("Atmosphere, moral ambiguity, memory, and quiet pressure.");

  const createResponse = waitForApiResponse(page, "POST", "/api/media-items/", 201);
  await dialog.getByRole("button", { name: "Save media" }).click();
  const media = await expectApiJson<{ id: string; title: string }>(await createResponse);
  await expect(page.getByRole("link", { name: title })).toBeVisible();
  return media;
}

test.describe("background jobs browser-to-backend flow", () => {
  test("tracks graph, metadata, narrative, and export jobs in notifications and Jobs page", async ({ page }) => {
    await registerViaUi(page);
    const title = uniqueTitle("E2E Job Media");
    await createMedia(page, title);

    await page.getByRole("link", { name: title }).click();
    await expect(page.getByRole("heading", { name: title })).toBeVisible();

    await page.getByRole("button", { name: "Edit" }).click();
    const dialog = page.getByRole("dialog", { name: "Edit media" });
    await expect(dialog).toBeVisible();
    const metadataSearch = waitForApiResponse(page, "GET", "/api/metadata/matches/", 200);
    await dialog.getByRole("button", { name: "Search metadata" }).click();
    await metadataSearch;
    const attachResponse = waitForApiResponse(page, "POST", /\/api\/media-items\/[^/]+\/metadata\/attach\/$/, 201);
    await dialog.getByRole("button", { name: "Attach metadata" }).first().click();
    await attachResponse;
    await dialog.getByRole("button", { name: "Cancel" }).first().click();

    const refreshResponse = waitForApiResponse(page, "POST", /\/api\/media-items\/[^/]+\/metadata\/refresh\/$/, 201);
    await page.getByRole("button", { name: "Refresh metadata" }).click();
    const refreshJob = await expectApiJson<{ status: string; id: string }>(await refreshResponse);
    expect(refreshJob.status).toBe("succeeded");

    await page.getByRole("tab", { name: "Narrative DNA" }).click();
    await page.getByLabel("Narrative analysis notes").fill("Atmosphere, identity, memory, moral ambiguity, and pressure.");
    const narrativeResponse = waitForApiResponse(page, "POST", /\/api\/media-items\/[^/]+\/narrative-analysis\/$/, 201);
    await page.getByRole("button", { name: "Request Narrative Analysis" }).click();
    const narrative = await expectApiJson<{ status: string; analysisSummary: string }>(await narrativeResponse);
    expect(narrative.status).toBe("completed");
    await expect(page.getByText("Analysis summary")).toBeVisible();

    await page.goto("/taste-graph");
    const rebuildResponse = waitForApiResponse(page, "POST", "/api/taste-graph/rebuild/", 201);
    await page.getByRole("button", { name: "Rebuild TasteGraph" }).first().click();
    const graphJob = await expectApiJson<{ id: string; status: string; nodeCount: number }>(await rebuildResponse);
    expect(graphJob.status).toBe("completed");
    expect(graphJob.nodeCount).toBeGreaterThan(0);
    await expect(page.getByLabel("TasteGraph rebuild status").getByText("TasteGraph rebuilt from media, creator, score, and aftertaste evidence.")).toBeVisible();

    await page.goto("/settings");
    const exportResponse = waitForApiResponse(page, "POST", "/api/exports/", 201);
    await page.getByRole("button", { name: "Request Export" }).click();
    const exportJob = await expectApiJson<{ format: string; recordCount: number }>(await exportResponse);
    expect(exportJob.format).toBe("json");
    expect(exportJob.recordCount).toBeGreaterThanOrEqual(1);

    await page.getByLabel("Open job notifications").click();
    await expect(page.getByText("Recent job notifications")).toBeVisible();
    await expect(page.getByRole("banner").locator("article").filter({ hasText: /Export complete|canonos-export/ }).first()).toBeVisible();

    await page.goto("/jobs");
    await expect(page.getByRole("heading", { name: "Background jobs", exact: true })).toBeVisible();
    const jobsResponse = waitForApiResponse(page, "GET", "/api/jobs/", 200);
    await page.getByRole("button", { name: "Refresh jobs" }).click();
    const jobs = await expectApiJson<{ jobType: string; status: string; sourceLabel: string }[]>(await jobsResponse);
    expect(jobs.some((job) => job.jobType === "metadata_refresh" && job.status === "complete")).toBe(true);
    expect(jobs.some((job) => job.jobType === "narrative_analysis" && job.status === "complete")).toBe(true);
    expect(jobs.some((job) => job.jobType === "graph_rebuild" && job.status === "complete")).toBe(true);
    expect(jobs.some((job) => job.jobType === "export" && job.status === "complete")).toBe(true);
    const recentJobs = page.getByLabel("Recent jobs");
    await expect(recentJobs.getByText("Metadata refresh", { exact: true }).first()).toBeVisible();
    await expect(recentJobs.getByText("Narrative analysis", { exact: true }).first()).toBeVisible();
    await expect(recentJobs.getByText("Graph rebuild", { exact: true }).first()).toBeVisible();
    await expect(recentJobs.getByText("Export", { exact: true }).first()).toBeVisible();
  });
});
