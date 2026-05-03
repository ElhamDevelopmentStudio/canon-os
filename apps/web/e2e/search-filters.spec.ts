import type { Page } from "@playwright/test";
import type { MediaItem, UnifiedSearchResponse } from "@canonos/contracts";

import { test, expect } from "./helpers/fixtures";
import { registerViaUi } from "./helpers/auth";
import { uniqueTitle } from "./helpers/data";
import { expectApiJson, waitForApiResponse } from "./helpers/network";

async function openAddMedia(page: Page) {
  await page.getByRole("button", { name: "Add Media" }).first().click();
  await expect(page.getByRole("dialog", { name: "Add media" })).toBeVisible();
}

async function createMediaThroughUi(
  page: Page,
  options: {
    title: string;
    creator?: string;
    personalRating?: string;
    completedDate?: string;
    status?: "planned" | "consuming" | "completed" | "paused" | "dropped";
  },
): Promise<MediaItem> {
  await openAddMedia(page);
  await page.getByLabel("Title", { exact: true }).fill(options.title);
  if (options.creator) await page.getByLabel("Creator / director / author").fill(options.creator);
  if (options.status) await page.getByLabel("Status", { exact: true }).selectOption(options.status);
  if (options.personalRating) await page.getByLabel("Personal rating").fill(options.personalRating);
  if (options.completedDate) await page.getByLabel("Completed date").fill(options.completedDate);

  const createResponse = waitForApiResponse(page, "POST", "/api/media-items/", 201);
  await page.getByRole("button", { name: "Save media" }).click();
  const payload = await expectApiJson<MediaItem>(await createResponse);
  await expect(page.getByRole("link", { name: options.title })).toBeVisible();
  return payload;
}

async function createCandidateThroughUi(page: Page, title: string): Promise<void> {
  await page.goto("/candidates");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Known creator").fill("CP-M14 Candidate Creator");
  await page.getByLabel("Source of interest").fill("Command palette coverage");
  await page.getByLabel("Premise / signal notes").fill("A focused search target for browser e2e coverage.");

  const createResponse = waitForApiResponse(page, "POST", "/api/candidates/", 201);
  await page.getByRole("button", { name: "Save Candidate" }).click();
  await createResponse;
  await expect(page.getByText("Candidate saved to evaluator history.")).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(escapeRegex(title)) })).toBeVisible();
}

async function waitForSearchPayload(page: Page, query: string): Promise<UnifiedSearchResponse> {
  const response = await page.waitForResponse((candidate) => {
    const url = new URL(candidate.url());
    return (
      candidate.request().method() === "GET" &&
      url.pathname === "/api/search/" &&
      url.searchParams.get("q") === query
    );
  });
  expect(response.status(), `GET /api/search/?q=${query} status`).toBe(200);
  return expectApiJson<UnifiedSearchResponse>(response);
}

async function waitForFilteredMediaPayload(
  page: Page,
  predicate: (params: URLSearchParams) => boolean,
) {
  const response = await page.waitForResponse((candidate) => {
    const url = new URL(candidate.url());
    return candidate.request().method() === "GET" && url.pathname === "/api/media-items/" && predicate(url.searchParams);
  });
  expect(response.status(), "GET /api/media-items/ filtered status").toBe(200);
  return expectApiJson<{ count: number; results: MediaItem[] }>(response);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test.describe("global search and advanced filters browser-to-backend flow", () => {
  test("opens the command palette with the keyboard shortcut and navigates media and candidate results", async ({ page }) => {
    await registerViaUi(page);
    const mediaTitle = uniqueTitle("E2E Search Media");
    const candidateTitle = uniqueTitle("E2E Search Candidate");

    const initialListResponse = waitForApiResponse(page, "GET", "/api/media-items/", 200);
    await page.goto("/library");
    await initialListResponse;
    await createMediaThroughUi(page, {
      title: mediaTitle,
      creator: "CP-M14 Search Director",
      personalRating: "8.7",
      completedDate: "2026-02-10",
      status: "completed",
    });
    await createCandidateThroughUi(page, candidateTitle);

    await page.keyboard.press("Control+K");
    await expect(page.getByRole("dialog", { name: /command palette/i })).toBeVisible();
    const mediaSearchResponse = waitForSearchPayload(page, mediaTitle);
    await page.getByRole("searchbox", { name: /global search/i }).fill(mediaTitle);
    const mediaSearchPayload = await mediaSearchResponse;
    const mediaResult = mediaSearchPayload.results.find((result) => result.title === mediaTitle);
    expect(mediaResult?.type).toBe("media");

    const mediaDetailResponse = waitForApiResponse(page, "GET", /\/api\/media-items\/[^/]+\/$/, 200);
    await page.getByRole("button", { name: new RegExp(escapeRegex(mediaTitle)) }).click();
    await mediaDetailResponse;
    await expect(page).toHaveURL(mediaResult?.targetUrl ?? /\/library\//);
    await expect(page.getByRole("heading", { name: mediaTitle })).toBeVisible();

    await page.keyboard.press("Control+K");
    await expect(page.getByRole("dialog", { name: /command palette/i })).toBeVisible();
    const candidateSearchResponse = waitForSearchPayload(page, candidateTitle);
    await page.getByRole("searchbox", { name: /global search/i }).fill(candidateTitle);
    const candidateSearchPayload = await candidateSearchResponse;
    const candidateResult = candidateSearchPayload.results.find((result) => result.title === candidateTitle);
    expect(candidateResult?.type).toBe("candidate");

    await page.getByRole("button", { name: new RegExp(escapeRegex(candidateTitle)) }).click();
    await expect(page).toHaveURL(candidateResult?.targetUrl ?? /\/candidates\?candidateId=/);
    await expect(page.getByLabel("Title")).toHaveValue(candidateTitle);
  });

  test("persists advanced Library filters in the URL and clears them", async ({ page }) => {
    await registerViaUi(page);
    const matchTitle = uniqueTitle("E2E Filter Match");
    const mismatchTitle = uniqueTitle("E2E Filter Mismatch");
    const creator = "CP-M14 Filter Auteur";

    const initialListResponse = waitForApiResponse(page, "GET", "/api/media-items/", 200);
    await page.goto("/library");
    await initialListResponse;
    await createMediaThroughUi(page, {
      title: matchTitle,
      creator,
      personalRating: "8.8",
      completedDate: "2026-02-10",
      status: "completed",
    });
    await createMediaThroughUi(page, {
      title: mismatchTitle,
      creator: "Other Filter Creator",
      personalRating: "5.0",
      completedDate: "2026-03-10",
      status: "completed",
    });

    await page.getByRole("button", { name: /advanced filters/i }).click();
    await page.getByLabel("Creator", { exact: true }).fill(creator);
    await page.getByLabel("Minimum rating").fill("8");
    const filteredResponse = waitForFilteredMediaPayload(
      page,
      (params) =>
        params.get("creator") === creator &&
        params.get("ratingMin") === "8" &&
        params.get("completedFrom") === "2026-02-01",
    );
    await page.getByLabel("Completed after").fill("2026-02-01");
    const filteredPayload = await filteredResponse;

    expect(filteredPayload.count).toBe(1);
    expect(filteredPayload.results[0].title).toBe(matchTitle);
    await expect(page.getByLabel("Active filters")).toContainText(`Creator: ${creator}`);
    await expect(page.getByLabel("Active filters")).toContainText("Min rating: 8");
    await expect(page.getByRole("link", { name: matchTitle })).toBeVisible();
    await expect(page.getByRole("link", { name: mismatchTitle })).toHaveCount(0);
    await expect.poll(() => new URL(page.url()).searchParams.get("creator")).toBe(creator);
    await expect.poll(() => new URL(page.url()).searchParams.get("ratingMin")).toBe("8");
    await expect.poll(() => new URL(page.url()).searchParams.get("completedFrom")).toBe("2026-02-01");

    await page.getByRole("button", { name: /clear filters/i }).click();

    await expect.poll(() => new URL(page.url()).search).toBe("");
    await expect(page.getByRole("link", { name: matchTitle })).toBeVisible();
    await expect(page.getByRole("link", { name: mismatchTitle })).toBeVisible();
  });
});
