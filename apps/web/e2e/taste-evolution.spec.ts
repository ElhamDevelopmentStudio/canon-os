import type { Page } from "@playwright/test";
import type { TasteEvolutionGenerateResponse, TasteEvolutionTimelineResponse } from "@canonos/contracts";

import { test, expect } from "./helpers/fixtures";
import { registerViaUi } from "./helpers/auth";
import { uniqueTitle } from "./helpers/data";
import { expectApiJson, waitForApiResponse } from "./helpers/network";

async function createScoredCompletedMedia(
  page: Page,
  {
    title,
    mediaTypeLabel,
    completedDate,
    rating,
    positiveScore,
    genericnessScore,
    regretScore,
  }: {
    title: string;
    mediaTypeLabel: string;
    completedDate: string;
    rating: string;
    positiveScore: string;
    genericnessScore: string;
    regretScore: string;
  },
) {
  const listResponse = waitForApiResponse(page, "GET", "/api/media-items/", 200);
  await page.goto("/library");
  await listResponse;
  await page.getByRole("button", { name: "Add Media" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Add media" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Title", { exact: true }).fill(title);
  await dialog.getByLabel("Status").selectOption({ label: "Completed" });
  await dialog.getByLabel("Media type").selectOption({ label: mediaTypeLabel });
  await dialog.getByLabel("Completed date").fill(completedDate);
  await dialog.getByLabel("Personal rating").fill(rating);
  await dialog.getByText("Genericness").scrollIntoViewIfNeeded();

  const scoreInputs = dialog.getByRole("spinbutton", { name: "Score" });
  await scoreInputs.nth(0).fill(positiveScore);
  await scoreInputs.nth(1).fill(positiveScore);
  await scoreInputs.nth(2).fill(positiveScore);
  await scoreInputs.nth(11).fill(genericnessScore);
  await scoreInputs.nth(12).fill(regretScore);

  const createResponse = waitForApiResponse(page, "POST", "/api/media-items/", 201);
  const scoreResponse = waitForApiResponse(page, "PUT", /\/api\/media-items\/[^/]+\/scores\/$/, 200);
  await page.getByRole("button", { name: "Save media" }).click();
  const payload = await expectApiJson<{ id: string; title: string }>(await createResponse);
  await scoreResponse;
  await expect(page.getByRole("link", { name: title })).toBeVisible();
  return payload.id;
}

async function addRegretAftertaste(page: Page, mediaTitle: string) {
  const listResponse = waitForApiResponse(page, "GET", "/api/aftertaste/", 200);
  const promptsResponse = waitForApiResponse(page, "GET", "/api/aftertaste/prompts/", 200);
  await page.goto("/aftertaste-log");
  await listResponse;
  await promptsResponse;
  await page.getByRole("button", { name: "New Reflection" }).first().click();
  const dialog = page.getByRole("dialog", { name: "New Reflection" });
  await dialog.getByLabel("Media item").selectOption({ label: mediaTitle });
  await dialog.getByLabel("Worth time").selectOption({ label: "No" });
  await dialog.getByLabel("Stayed with me score").fill("8");
  await dialog.getByLabel("Felt generic").selectOption({ label: "Yes" });
  await dialog.getByLabel("Completion reason").fill("Finished, but the familiar shape caused regret.");
  await dialog.getByLabel("Final thoughts").fill("Useful evidence for genericness tolerance and regret trend.");
  const createResponse = waitForApiResponse(page, "POST", "/api/aftertaste/", 201);
  await page.getByRole("button", { name: "Save reflection" }).click();
  await createResponse;
  await expect(page.getByText("Aftertaste entry saved.")).toBeVisible();
}

test.describe("taste evolution browser-to-backend flow", () => {
  test("generates timeline snapshots and shows the latest dashboard insight", async ({ page }) => {
    await registerViaUi(page);

    const emptyTimelineResponse = waitForApiResponse(page, "GET", "/api/taste-evolution/", 200);
    await page.goto("/taste-evolution");
    const emptyTimeline = await expectApiJson<TasteEvolutionTimelineResponse>(await emptyTimelineResponse);
    expect(emptyTimeline.count).toBe(0);
    await expect(page.getByText("No taste evolution snapshots yet")).toBeVisible();

    const firstTitle = uniqueTitle("E2E Evolution January");
    const latestTitle = uniqueTitle("E2E Evolution February");
    await createScoredCompletedMedia(page, {
      title: firstTitle,
      mediaTypeLabel: "Movie",
      completedDate: "2026-01-08",
      rating: "6.5",
      positiveScore: "6.0",
      genericnessScore: "2.0",
      regretScore: "1.0",
    });
    await createScoredCompletedMedia(page, {
      title: latestTitle,
      mediaTypeLabel: "Anime",
      completedDate: "2026-02-12",
      rating: "9.0",
      positiveScore: "9.0",
      genericnessScore: "9.0",
      regretScore: "9.0",
    });
    await addRegretAftertaste(page, latestTitle);

    const timelineResponse = waitForApiResponse(page, "GET", "/api/taste-evolution/", 200);
    await page.goto("/taste-evolution");
    await timelineResponse;
    const generateResponse = waitForApiResponse(page, "POST", "/api/taste-evolution/generate/", 201);
    await page.getByRole("button", { name: "Generate Snapshot" }).first().click();
    const generated = await expectApiJson<TasteEvolutionGenerateResponse>(await generateResponse);
    expect(generated.aggregateData.ratingTrend.points.length).toBeGreaterThanOrEqual(2);
    expect(generated.aggregateData.genericnessToleranceTrend.currentValue).not.toBeNull();
    expect(generated.insights.length).toBeGreaterThan(0);

    await expect(page.getByRole("heading", { name: "Taste Evolution Journal" })).toBeVisible();
    await expect(page.getByRole("heading", { exact: true, name: "Rating trend" })).toBeVisible();
    await expect(page.getByRole("heading", { exact: true, name: "Medium trend" })).toBeVisible();
    await expect(page.getByRole("heading", { exact: true, name: "Genericness tolerance" })).toBeVisible();
    await expect(page.getByRole("heading", { exact: true, name: "Regret trend" })).toBeVisible();
    await expect(page.getByRole("heading", { exact: true, name: "Completion fatigue" })).toBeVisible();
    await expect(page.getByRole("heading", { exact: true, name: "Favorite dimension" })).toBeVisible();
    await expect(page.getByRole("heading", { exact: true, name: "Snapshot history" })).toBeVisible();

    const dashboardResponse = waitForApiResponse(page, "GET", "/api/dashboard/summary/", 200);
    await page.goto("/");
    const dashboard = await expectApiJson<{ latestTasteEvolutionInsight: { title: string } | null }>(
      await dashboardResponse,
    );
    const latestInsightTitle = dashboard.latestTasteEvolutionInsight?.title;
    expect(latestInsightTitle).toBeTruthy();
    await expect(page.getByRole("heading", { name: "Latest taste shift" })).toBeVisible();
    await expect(page.getByText(latestInsightTitle as string)).toBeVisible();
  });
});
