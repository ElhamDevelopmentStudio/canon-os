import type {
  Candidate,
  CanonSeason,
  CanonSeasonItem,
  CanonSeasonItemReorderResponse,
  MediaItem,
} from "@canonos/contracts";
import type { Locator, Page } from "@playwright/test";

import { registerViaUi } from "./helpers/auth";
import { uniqueTitle } from "./helpers/data";
import { expect, test } from "./helpers/fixtures";
import { expectApiJson, waitForApiResponse } from "./helpers/network";

async function createMediaItem(page: Page, title: string): Promise<MediaItem> {
  const listResponse = waitForApiResponse(page, "GET", "/api/media-items/", 200);
  await page.goto("/library");
  await listResponse;
  await page.getByRole("button", { name: "Add Media" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Add media" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Title", { exact: true }).fill(title);
  await dialog.getByLabel("Media type").selectOption({ label: "Movie" });
  await dialog.getByLabel("Status").selectOption({ label: "Planned" });
  await dialog.getByLabel("Creator / director / author").fill("Canon E2E Director");
  const createResponse = waitForApiResponse(page, "POST", "/api/media-items/", 201);
  await dialog.getByRole("button", { name: "Save media" }).click();
  const payload = await expectApiJson<MediaItem>(await createResponse);
  await expect(page.getByRole("link", { name: title })).toBeVisible();
  return payload;
}

async function createCandidate(page: Page, title: string): Promise<Candidate> {
  const listResponse = waitForApiResponse(page, "GET", "/api/candidates/", 200);
  await page.goto("/candidates");
  await listResponse;
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Known creator").fill("Canon E2E Author");
  await page.getByLabel("Source of interest").fill("Personal Canon e2e setup");
  await page.getByLabel("Premise / signal notes").fill("A source text that belongs in a focused canon path.");
  await page.getByLabel("Expected genericness (0-10)").fill("2");
  const createResponse = waitForApiResponse(page, "POST", "/api/candidates/", 201);
  await page.getByRole("button", { name: "Save Candidate" }).click();
  const payload = await expectApiJson<Candidate>(await createResponse);
  await expect(page.getByText("Candidate saved to evaluator history.")).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(title) })).toBeVisible();
  return payload;
}

async function addSeasonItem(
  page: Page,
  configure: (dialog: Locator) => Promise<void>,
): Promise<CanonSeasonItem> {
  await page.getByRole("button", { name: "Add Item" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Add Season Item" });
  await expect(dialog).toBeVisible();
  await configure(dialog);
  const createResponse = waitForApiResponse(page, "POST", /\/api\/seasons\/[^/]+\/items\/$/, 201);
  await dialog.getByRole("button", { name: "Save Item" }).click();
  const payload = await expectApiJson<CanonSeasonItem>(await createResponse);
  await expect(page.getByText("Canon season item added.")).toBeVisible();
  return payload;
}

test.describe("personal canon browser-to-backend flow", () => {
  test("creates a season, adds mixed-source items, reorders, completes, canon-marks, and reflects", async ({
    page,
  }) => {
    await registerViaUi(page);
    const media = await createMediaItem(page, uniqueTitle("E2E Canon Film"));
    const candidate = await createCandidate(page, uniqueTitle("E2E Canon Source"));
    const seasonTitle = uniqueTitle("E2E Atmosphere Canon");
    const customTitle = uniqueTitle("E2E Custom Canon");

    const listResponse = waitForApiResponse(page, "GET", "/api/seasons/", 200);
    await page.goto("/seasons");
    await listResponse;
    await expect(page.getByRole("heading", { name: "Personal Canon" })).toBeVisible();
    await expect(page.getByText("No canon seasons yet")).toBeVisible();

    await page.getByRole("button", { name: "Create Season" }).first().click();
    const seasonDialog = page.getByRole("dialog", { name: "Create Season" });
    await expect(seasonDialog).toBeVisible();
    await seasonDialog.getByLabel("Title").fill(seasonTitle);
    await seasonDialog.getByLabel("Theme").selectOption("atmosphere_over_plot");
    await seasonDialog.getByLabel("Description").fill("A cross-medium path about texture over plot.");
    const createSeasonResponse = waitForApiResponse(page, "POST", "/api/seasons/", 201);
    await seasonDialog.getByRole("button", { name: "Save Season" }).click();
    const season = await expectApiJson<CanonSeason>(await createSeasonResponse);
    expect(season.title).toBe(seasonTitle);
    expect(season.theme).toBe("atmosphere_over_plot");
    await expect(page.getByRole("link", { name: seasonTitle })).toBeVisible();

    const detailResponse = waitForApiResponse(page, "GET", `/api/seasons/${season.id}/`, 200);
    await page.getByRole("link", { name: seasonTitle }).click();
    await detailResponse;
    await expect(page).toHaveURL(`/seasons/${season.id}`);
    await expect(page.getByRole("heading", { name: seasonTitle })).toBeVisible();
    await expect(page.getByText("No season items yet")).toBeVisible();

    const customItem = await addSeasonItem(page, async (dialog) => {
      await dialog.getByLabel("Source type").selectOption("custom");
      await dialog.getByLabel("Title").fill(customTitle);
      await dialog.getByLabel("Media type").selectOption({ label: "Audiobook" });
      await dialog.getByLabel("Reason included").fill("A custom listening contrast for the season.");
      await dialog.getByLabel("What to pay attention to").fill("Notice how narration changes atmosphere.");
      await dialog.getByLabel("Canon status").selectOption("historically_important");
    });
    expect(customItem.titleSnapshot).toBe(customTitle);
    expect(customItem.canonStatus).toBe("historically_important");

    const mediaItem = await addSeasonItem(page, async (dialog) => {
      await dialog.getByLabel("Source type").selectOption("media");
      await dialog.getByLabel("Media item", { exact: true }).selectOption({ label: media.title });
      await dialog.getByLabel("Reason included").fill("A visual anchor for the season.");
      await dialog.getByLabel("What to pay attention to").fill("Watch silence, texture, and visual rhythm.");
    });
    expect(mediaItem.mediaItemId).toBe(media.id);
    expect(mediaItem.titleSnapshot).toBe(media.title);

    const candidateItem = await addSeasonItem(page, async (dialog) => {
      await dialog.getByLabel("Source type").selectOption("candidate");
      await dialog.getByLabel("Candidate", { exact: true }).selectOption({ label: candidate.title });
      await dialog.getByLabel("Reason included").fill("A source text contrast for the filmed mood.");
      await dialog.getByLabel("What to pay attention to").fill("Compare density and thematic pressure.");
    });
    expect(candidateItem.candidateId).toBe(candidate.id);
    expect(candidateItem.titleSnapshot).toBe(candidate.title);

    const reorderResponse = waitForApiResponse(page, "POST", `/api/seasons/${season.id}/items/reorder/`, 200);
    await page.getByRole("button", { name: `Move ${candidate.title} up` }).click();
    const reordered = await expectApiJson<CanonSeasonItemReorderResponse>(await reorderResponse);
    expect(reordered.results.map((item) => item.id)).toEqual([customItem.id, candidateItem.id, mediaItem.id]);
    await expect(page.getByText("Season order updated.")).toBeVisible();

    const completeResponse = waitForApiResponse(
      page,
      "PATCH",
      `/api/seasons/${season.id}/items/${candidateItem.id}/`,
      200,
    );
    await page.getByRole("article", { name: `Season item ${candidate.title}` }).getByRole("button", { name: "Mark Complete" }).click();
    const completed = await expectApiJson<CanonSeasonItem>(await completeResponse);
    expect(completed.completionStatus).toBe("completed");
    await expect(page.getByText("1/3").first()).toBeVisible();

    const canonStatusResponse = waitForApiResponse(
      page,
      "PATCH",
      `/api/seasons/${season.id}/items/${candidateItem.id}/`,
      200,
    );
    await page.getByLabel(`Canon status for ${candidate.title}`).selectOption("near_canon");
    const canonMarked = await expectApiJson<CanonSeasonItem>(await canonStatusResponse);
    expect(canonMarked.canonStatus).toBe("near_canon");
    await expect(page.getByText("Near-canon").first()).toBeVisible();

    await page.getByLabel("Summary notes").fill("This season proved atmosphere can carry moral pressure.");
    const reflectionResponse = waitForApiResponse(page, "PATCH", `/api/seasons/${season.id}/`, 200);
    await page.getByRole("button", { name: "Save Reflection" }).click();
    const reflected = await expectApiJson<CanonSeason>(await reflectionResponse);
    expect(reflected.reflectionNotes).toContain("atmosphere can carry moral pressure");
    await expect(page.getByText("Season reflection saved.")).toBeVisible();

    const deleteItemResponse = waitForApiResponse(
      page,
      "DELETE",
      `/api/seasons/${season.id}/items/${mediaItem.id}/`,
      204,
    );
    await page.getByRole("button", { name: `Remove ${media.title}` }).click();
    await deleteItemResponse;
    await expect(page.getByText(`${media.title} removed from this season.`)).toBeVisible();
    await expect(page.getByRole("article", { name: `Season item ${media.title}` })).toBeHidden();
  });
});
