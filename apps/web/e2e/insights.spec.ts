import type {
  AnalyticsConsumptionTimelineResponse,
  AnalyticsDimensionTrendsResponse,
  AnalyticsGenericnessSatisfactionResponse,
  AnalyticsMediaTypeDistributionResponse,
  AnalyticsRatingDistributionResponse,
  AnalyticsRegretTimeCostResponse,
  AnalyticsTopCreatorsResponse,
  AnalyticsTopThemesResponse,
  MediaItem,
  TasteDimension,
} from "@canonos/contracts";
import type { Page } from "@playwright/test";

import { registerViaUi } from "./helpers/auth";
import { uniqueTitle } from "./helpers/data";
import { test, expect } from "./helpers/fixtures";
import { browserFetchJson, expectApiJson, waitForApiResponse } from "./helpers/network";

const ANALYTICS_ENDPOINTS = [
  "/api/analytics/consumption-timeline/",
  "/api/analytics/rating-distribution/",
  "/api/analytics/media-type-distribution/",
  "/api/analytics/dimension-trends/",
  "/api/analytics/genericness-satisfaction/",
  "/api/analytics/regret-time-cost/",
  "/api/analytics/top-creators/",
  "/api/analytics/top-themes/",
] as const;

type AnalyticsPayloads = {
  timeline: AnalyticsConsumptionTimelineResponse;
  ratings: AnalyticsRatingDistributionResponse;
  mediaTypes: AnalyticsMediaTypeDistributionResponse;
  dimensions: AnalyticsDimensionTrendsResponse;
  genericness: AnalyticsGenericnessSatisfactionResponse;
  regret: AnalyticsRegretTimeCostResponse;
  creators: AnalyticsTopCreatorsResponse;
  themes: AnalyticsTopThemesResponse;
};

async function waitForAnalyticsPayloads(page: Page): Promise<AnalyticsPayloads> {
  const responses = ANALYTICS_ENDPOINTS.map((path) => waitForApiResponse(page, "GET", path, 200));
  const [timeline, ratings, mediaTypes, dimensions, genericness, regret, creators, themes] = await Promise.all(
    responses.map(async (response) => expectApiJson(await response)),
  );
  return {
    timeline: timeline as AnalyticsConsumptionTimelineResponse,
    ratings: ratings as AnalyticsRatingDistributionResponse,
    mediaTypes: mediaTypes as AnalyticsMediaTypeDistributionResponse,
    dimensions: dimensions as AnalyticsDimensionTrendsResponse,
    genericness: genericness as AnalyticsGenericnessSatisfactionResponse,
    regret: regret as AnalyticsRegretTimeCostResponse,
    creators: creators as AnalyticsTopCreatorsResponse,
    themes: themes as AnalyticsTopThemesResponse,
  };
}

async function csrfHeaders(page: Page): Promise<Record<string, string>> {
  const cookies = await page.context().cookies("http://localhost:8000");
  const token = cookies.find((cookie) => cookie.name === "csrftoken")?.value;
  expect(token, "csrftoken cookie").toBeTruthy();
  return {
    "Content-Type": "application/json",
    "X-CSRFToken": token as string,
  };
}

async function apiWrite<T>(page: Page, path: string, method: "POST" | "PUT", body: unknown): Promise<T> {
  const result = await browserFetchJson<T>(page, path, {
    method,
    headers: await csrfHeaders(page),
    body: JSON.stringify(body),
  });
  expect([200, 201], `${method} ${path} status`).toContain(result.status);
  return result.body;
}

async function createMedia(page: Page, payload: Partial<MediaItem> & { title: string; mediaType: MediaItem["mediaType"]; status: MediaItem["status"] }): Promise<MediaItem> {
  return apiWrite<MediaItem>(page, "/media-items/", "POST", payload);
}

async function scoreMedia(
  page: Page,
  mediaId: string,
  dimensions: TasteDimension[],
  scoresBySlug: Record<string, number>,
): Promise<void> {
  const scores = Object.entries(scoresBySlug).map(([slug, score]) => {
    const dimension = dimensions.find((candidate) => candidate.slug === slug);
    expect(dimension, `${slug} dimension`).toBeTruthy();
    return { dimensionId: (dimension as TasteDimension).id, score };
  });
  await apiWrite(page, `/media-items/${mediaId}/scores/`, "PUT", { scores });
}

async function seedInsightEvidence(page: Page) {
  const dimensionsResponse = await browserFetchJson<TasteDimension[]>(page, "/taste-dimensions/");
  expect(dimensionsResponse.status).toBe(200);
  const dimensions = dimensionsResponse.body;
  const firstTitle = uniqueTitle("E2E Insight Atmosphere");
  const secondTitle = uniqueTitle("E2E Insight Novel");
  const droppedTitle = uniqueTitle("E2E Insight Filler");

  const movie = await createMedia(page, {
    title: firstTitle,
    mediaType: "movie",
    status: "completed",
    creator: "E2E Insight Auteur",
    personalRating: 9.4,
    completedDate: "2026-01-12",
    runtimeMinutes: 120,
    notes: "Atmospheric, haunting, morally ambiguous, spiritual, memory-rich, and authorial.",
  });
  await scoreMedia(page, movie.id, dimensions, {
    atmosphere: 9.5,
    genericness: 2,
    regret_score: 1,
  });

  const novel = await createMedia(page, {
    title: secondTitle,
    mediaType: "novel",
    status: "completed",
    creator: "E2E Insight Auteur",
    personalRating: 8.1,
    completedDate: "2026-02-14",
    pageCount: 220,
    notes: "Dense memory and theme work with a distinctive authorial voice.",
  });
  await scoreMedia(page, novel.id, dimensions, {
    atmosphere: 8,
    genericness: 3,
    regret_score: 2,
  });

  const filler = await createMedia(page, {
    title: droppedTitle,
    mediaType: "tv_show",
    status: "dropped",
    creator: "E2E Formula Studio",
    personalRating: 3,
    startedDate: "2026-02-18",
    episodeCount: 3,
    notes: "Formulaic filler that felt generic and regret-heavy.",
  });
  await scoreMedia(page, filler.id, dimensions, {
    genericness: 9,
    regret_score: 8,
  });

  await apiWrite(page, `/media-items/${movie.id}/narrative-analysis/`, "POST", {
    manualNotes: "Atmosphere, moral ambiguity, memory, spiritual meaning, and haunting mood dominate the work.",
    forceRefresh: true,
    provider: "local_heuristic",
  });

  return { firstTitle, droppedTitle };
}

test.describe("insights browser-to-backend flow", () => {
  test("renders empty analytics from real endpoints", async ({ page }) => {
    await registerViaUi(page);

    const payloadPromise = waitForAnalyticsPayloads(page);
    await page.goto("/insights");
    const payloads = await payloadPromise;

    expect(payloads.timeline.isEmpty).toBe(true);
    expect(payloads.ratings.ratedCount).toBe(0);
    expect(payloads.mediaTypes.totalCount).toBe(0);
    expect(payloads.dimensions.dimensions).toEqual([]);
    expect(payloads.genericness.points).toEqual([]);
    expect(payloads.regret.points).toEqual([]);
    expect(payloads.creators.results).toEqual([]);
    expect(payloads.themes.results).toEqual([]);
    await expect(page.getByRole("heading", { name: /readable patterns from your media history/i })).toBeVisible();
    await expect(page.getByText(/ready for your first evidence trail/i)).toBeVisible();
    await expect(page.getByText(/finish or drop media to populate the timeline/i)).toBeVisible();
  });

  test("renders sample analytics and stays readable on mobile", async ({ page }) => {
    await registerViaUi(page);
    const seeded = await seedInsightEvidence(page);
    await page.setViewportSize({ width: 390, height: 900 });

    const payloadPromise = waitForAnalyticsPayloads(page);
    await page.goto("/insights");
    const payloads = await payloadPromise;

    expect(payloads.timeline.points.map((point) => point.period)).toEqual(["2026-01", "2026-02"]);
    expect(payloads.ratings.ratedCount).toBe(3);
    expect(payloads.mediaTypes.results.some((row) => row.mediaType === "movie" && row.count === 1)).toBe(true);
    expect(payloads.dimensions.dimensions.some((dimension) => dimension.dimensionSlug === "atmosphere")).toBe(true);
    expect(payloads.genericness.points.length).toBeGreaterThanOrEqual(3);
    expect(payloads.regret.totalHighRegretMinutes).toBe(135);
    expect(payloads.creators.results[0].creator).toBe("E2E Insight Auteur");
    expect(payloads.themes.results.length).toBeGreaterThan(0);

    await expect(page.getByRole("heading", { name: "Consumption timeline" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Rating distribution" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Media type distribution" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Dimension trends" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Genericness vs satisfaction" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Regret vs time cost" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Top creators" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Top themes" })).toBeVisible();
    await expect(page.getByText("E2E Insight Auteur")).toBeVisible();
    await expect(page.getByLabel("Regret vs time cost").getByText(seeded.droppedTitle)).toBeVisible();
    await expect(page.getByLabel("Top themes").getByText(seeded.firstTitle).first()).toBeVisible();
  });
});
