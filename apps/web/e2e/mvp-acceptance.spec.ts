import type { Page } from "@playwright/test";

import { loginViaUi, logoutViaUi, registerViaUi } from "./helpers/auth";
import { uniqueTitle, uniqueUser } from "./helpers/data";
import { expect, test } from "./helpers/fixtures";
import { expectApiJson, waitForApiResponse } from "./helpers/network";

type MediaDraft = {
  title: string;
  mediaType: "Movie" | "Anime" | "Novel";
  status: "Completed" | "Planned" | "Consuming";
  rating?: string;
  creator?: string;
  runtimeMinutes?: string;
  episodeCount?: string;
  pageCount?: string;
  notes?: string;
};

type MediaPayload = {
  id: string;
  title: string;
};

const routes = [
  { label: "Dashboard", path: "/", heading: /private media command center/i },
  { label: "Library", path: "/library", heading: "Library" },
  { label: "Candidates", path: "/candidates", heading: "Candidate Evaluator" },
  { label: "Media Archaeologist", path: "/discover", heading: "Media Archaeologist" },
  { label: "Tonight Mode", path: "/tonight", heading: "Tonight Mode" },
  { label: "Taste Profile", path: "/taste-profile", heading: "Taste Profile" },
  { label: "TasteGraph", path: "/taste-graph", heading: "TasteGraph" },
  { label: "Completion Detox", path: "/completion-detox", heading: "Completion Detox" },
  { label: "Personal Canon", path: "/seasons", heading: "Personal Canon" },
  { label: "Aftertaste Log", path: "/aftertaste-log", heading: "Aftertaste Log" },
  { label: "Queue", path: "/queue", heading: "Adaptive Queue" },
  { label: "Settings", path: "/settings", heading: "Settings" },
];

async function addMedia(page: Page, draft: MediaDraft): Promise<MediaPayload> {
  const listResponse = waitForApiResponse(page, "GET", "/api/media-items/", 200);
  await page.goto("/library");
  await listResponse;
  await page.getByRole("button", { name: "Add Media" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Add media" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Title", { exact: true }).fill(draft.title);
  await dialog.getByLabel("Media type").selectOption({ label: draft.mediaType });
  await dialog.getByLabel("Status").selectOption({ label: draft.status });
  if (draft.creator) await dialog.getByLabel("Creator / director / author").fill(draft.creator);
  if (draft.rating) await dialog.getByLabel("Personal rating").fill(draft.rating);
  if (draft.runtimeMinutes) await dialog.getByLabel("Runtime minutes").fill(draft.runtimeMinutes);
  if (draft.episodeCount) await dialog.getByLabel("Episode count").fill(draft.episodeCount);
  if (draft.pageCount) await dialog.getByLabel("Page count").fill(draft.pageCount);
  if (draft.notes) await dialog.getByLabel("Notes").fill(draft.notes);

  const createResponse = waitForApiResponse(page, "POST", "/api/media-items/", 201);
  await dialog.getByRole("button", { name: "Save media" }).click();
  const payload = await expectApiJson<MediaPayload>(await createResponse);
  await expect(page.getByRole("link", { name: draft.title })).toBeVisible();
  return payload;
}

async function scoreMedia(page: Page, media: MediaPayload, score: string): Promise<void> {
  const detailResponse = waitForApiResponse(page, "GET", `/api/media-items/${media.id}/`, 200);
  await page.goto(`/library/${media.id}`);
  await detailResponse;
  await expect(page.getByRole("heading", { name: media.title })).toBeVisible();
  const scoreInput = page.getByRole("spinbutton", { name: "Score" }).first();
  await expect(scoreInput).toBeVisible();
  await scoreInput.fill(score);
  await page.getByRole("textbox", { name: "Score note" }).first().fill(`Acceptance score for ${media.title}.`);
  const scoreResponse = waitForApiResponse(page, "PUT", `/api/media-items/${media.id}/scores/`, 200);
  await page.getByRole("button", { name: "Save scores" }).click();
  await scoreResponse;
}

async function createAftertaste(page: Page, media: MediaPayload): Promise<void> {
  const listResponse = waitForApiResponse(page, "GET", "/api/aftertaste/", 200);
  const promptsResponse = waitForApiResponse(page, "GET", "/api/aftertaste/prompts/", 200);
  await page.goto("/aftertaste-log");
  await listResponse;
  await promptsResponse;
  await page.getByRole("button", { name: "New Reflection" }).first().click();
  const dialog = page.getByRole("dialog", { name: "New Reflection" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Media item").selectOption({ label: media.title });
  await dialog.getByLabel("Worth time").selectOption({ label: "Yes" });
  await dialog.getByLabel("Stayed with me score").fill("9");
  await dialog.getByLabel("Felt alive").selectOption({ label: "Yes" });
  await dialog.getByLabel("Felt generic").selectOption({ label: "No" });
  await dialog.getByLabel("Completion reason").fill("Finished during MVP acceptance testing.");
  await dialog.getByLabel("What worked").fill("It had strong atmosphere and a memorable core idea.");
  await dialog.getByLabel("What failed").fill("A minor pacing dip in the middle.");
  await dialog.getByLabel("Final thoughts").fill("Acceptance reflection stayed with me overnight.");
  await dialog.getByLabel("Appetite effect").selectOption({ label: "More like this" });
  const response = waitForApiResponse(page, "POST", "/api/aftertaste/", 201);
  await dialog.getByRole("button", { name: "Save reflection" }).click();
  await response;
  await expect(page.getByText("Aftertaste entry saved.")).toBeVisible();
}

async function createEvaluateAndQueueCandidate(page: Page, title: string): Promise<void> {
  const listResponse = waitForApiResponse(page, "GET", "/api/candidates/", 200);
  await page.goto("/candidates");
  await listResponse;
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Known creator").fill("Acceptance Creator");
  await page.getByLabel("Source of interest").fill("MVP acceptance scenario");
  await page.getByLabel("Premise / signal notes").fill("Focused, strange, and likely worth sampling.");
  await page.getByLabel("Expected genericness (0-10)").fill("2");
  await page.getByLabel("Expected time cost (minutes)").fill("95");

  const createResponse = waitForApiResponse(page, "POST", "/api/candidates/", 201);
  const evaluateResponse = waitForApiResponse(page, "POST", /\/api\/candidates\/[^/]+\/evaluate\/$/, 200);
  await page.getByRole("button", { name: "Run Evaluation" }).click();
  await createResponse;
  await evaluateResponse;
  await expect(page.getByText("Evaluation saved with the candidate history.")).toBeVisible();

  const addToQueueResponse = waitForApiResponse(page, "POST", "/api/queue-items/", 201);
  await page.getByRole("button", { name: "Add To Queue" }).click();
  await addToQueueResponse;
  await expect(page.getByText(`Added “${title}” to the queue.`)).toBeVisible();
}

test.describe("MVP acceptance", () => {
  test("renders every MVP route through the sidebar on desktop and mobile", async ({ page }) => {
    await registerViaUi(page, uniqueUser("routes"));

    for (const route of routes) {
      await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: route.label }).click();
      await expect(page).toHaveURL(route.path);
      await expect(page.getByRole("heading", { name: route.heading, exact: typeof route.heading === "string" ? true : undefined })).toBeVisible();
    }

    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible();
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL("/settings");
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
  });

  test("completes and persists the MVP user acceptance journey", async ({ page }) => {
    test.setTimeout(90_000);

    const user = uniqueUser("mvp");
    await registerViaUi(page, user);

    const movie = await addMedia(page, {
      title: uniqueTitle("MVP Movie"),
      mediaType: "Movie",
      status: "Completed",
      rating: "9.2",
      creator: "Acceptance Director",
      runtimeMinutes: "112",
      notes: "Dense and atmospheric acceptance movie.",
    });
    const anime = await addMedia(page, {
      title: uniqueTitle("MVP Anime"),
      mediaType: "Anime",
      status: "Completed",
      rating: "8.7",
      creator: "Acceptance Studio",
      episodeCount: "1",
      notes: "Compact anime acceptance signal.",
    });
    const novel = await addMedia(page, {
      title: uniqueTitle("MVP Novel"),
      mediaType: "Novel",
      status: "Planned",
      pageCount: "45",
      creator: "Acceptance Author",
      notes: "Short deep literary wildcard for Tonight Mode.",
    });

    await scoreMedia(page, movie, "9.0");
    await scoreMedia(page, anime, "8.5");
    await createAftertaste(page, movie);

    const tasteResponse = waitForApiResponse(page, "GET", "/api/taste-profile/", 200);
    await page.goto("/taste-profile");
    const tastePayload = await expectApiJson<{ generatedSummary: string; recentlyInfluentialWorks: { title: string }[] }>(
      await tasteResponse,
    );
    expect(tastePayload.generatedSummary.length).toBeGreaterThan(0);
    expect(tastePayload.recentlyInfluentialWorks.some((work) => work.title === movie.title)).toBe(true);
    await expect(page.getByRole("heading", { name: "Current taste read" })).toBeVisible();

    const candidateTitle = uniqueTitle("MVP Candidate");
    await createEvaluateAndQueueCandidate(page, candidateTitle);

    await page.goto("/tonight");
    await page.getByLabel("Available time (minutes)").fill("130");
    await page.getByLabel("Focus level").selectOption({ label: "Deep" });
    await page.getByLabel("Desired effect").selectOption({ label: "Deep" });
    await page.getByLabel("Risk tolerance").selectOption({ label: "Medium" });
    const tonightResponse = waitForApiResponse(page, "POST", "/api/queue/tonight/", 201);
    await page.getByRole("button", { name: "Generate Tonight Plan" }).click();
    const tonightPayload = await expectApiJson<{ recommendations: { title: string }[] }>(await tonightResponse);
    expect(tonightPayload.recommendations.some((item) => item.title === novel.title)).toBe(true);
    await expect(page.getByText("Tonight Mode plan generated.")).toBeVisible();
    const novelCard = page.locator("article").filter({ hasText: novel.title });
    const startResponse = waitForApiResponse(page, "PATCH", `/api/media-items/${novel.id}/`, 200);
    await novelCard.getByRole("button", { name: "Start This" }).click();
    await startResponse;
    await expect(page.getByText(`${novel.title} is now marked as consuming.`)).toBeVisible();

    const dashboardResponse = waitForApiResponse(page, "GET", "/api/dashboard/summary/", 200);
    await page.goto("/");
    const dashboardPayload = await expectApiJson<{ counts: { totalMedia: number } }>(await dashboardResponse);
    expect(dashboardPayload.counts.totalMedia).toBeGreaterThanOrEqual(3);
    await expect(page.getByText("Total library")).toBeVisible();

    const settingsResponse = waitForApiResponse(page, "GET", "/api/auth/settings/", 200);
    await page.goto("/settings");
    await settingsResponse;
    await page.getByLabel("Display name").fill("MVP Acceptance Reader");
    await page.getByLabel("Theme preference").selectOption({ label: "Dark" });
    await page.getByLabel("Default risk tolerance").selectOption({ label: "High" });
    const saveSettingsResponse = waitForApiResponse(page, "PATCH", "/api/auth/settings/", 200);
    await page.getByRole("button", { name: "Save Settings" }).click();
    await saveSettingsResponse;
    await expect(page.getByText("Settings saved.")).toBeVisible();

    const importedTitle = uniqueTitle("MVP Imported");
    const csv = [
      "title,media_type,status,personal_rating,release_year,creator,score_atmosphere",
      `${importedTitle},movie,completed,8.9,2005,Acceptance Importer,8.0`,
    ].join("\n");
    await page.getByLabel("Import file").setInputFiles({
      name: "mvp-acceptance.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv),
    });
    const previewResponse = waitForApiResponse(page, "POST", "/api/imports/preview/", 201);
    await page.getByRole("button", { name: "Preview Import" }).click();
    const preview = await expectApiJson<{ id: string; validCount: number }>(await previewResponse);
    expect(preview.validCount).toBe(1);
    const confirmResponse = waitForApiResponse(page, "POST", `/api/imports/${preview.id}/confirm/`, 200);
    await page.getByRole("button", { name: "Confirm Import" }).click();
    await confirmResponse;
    await expect(page.getByLabel("Import and export").getByText("Import complete. Created 1 records.")).toBeVisible();

    await page.getByLabel("Export format").selectOption({ label: "Full JSON backup" });
    const jsonExportResponse = waitForApiResponse(page, "POST", "/api/exports/", 201);
    await page.getByRole("button", { name: "Request Export" }).click();
    const jsonExport = await expectApiJson<{ id: string; format: string }>(await jsonExportResponse);
    expect(jsonExport.format).toBe("json");
    const jsonDownloadResponse = waitForApiResponse(page, "GET", `/api/exports/${jsonExport.id}/download/`, 200);
    await page.getByRole("button", { name: "Download Export" }).click();
    expect(await (await jsonDownloadResponse).text()).toContain(importedTitle);

    await page.getByLabel("Export format").selectOption({ label: "Media and ratings CSV" });
    const csvExportResponse = waitForApiResponse(page, "POST", "/api/exports/", 201);
    await page.getByRole("button", { name: "Request Export" }).click();
    const csvExport = await expectApiJson<{ id: string; format: string }>(await csvExportResponse);
    expect(csvExport.format).toBe("csv");
    const csvDownloadResponse = waitForApiResponse(page, "GET", `/api/exports/${csvExport.id}/download/`, 200);
    await page.getByRole("button", { name: "Download Export" }).click();
    expect(await (await csvDownloadResponse).text()).toContain("score_atmosphere");

    await logoutViaUi(page);
    await loginViaUi(page, user);
    const persistedLibraryResponse = waitForApiResponse(page, "GET", "/api/media-items/", 200);
    await page.goto("/library");
    await persistedLibraryResponse;
    await expect(page.getByRole("link", { name: movie.title })).toBeVisible();
    await expect(page.getByRole("link", { name: anime.title })).toBeVisible();
    await expect(page.getByRole("link", { name: novel.title })).toBeVisible();
    await expect(page.getByRole("link", { name: importedTitle })).toBeVisible();
  });
});
