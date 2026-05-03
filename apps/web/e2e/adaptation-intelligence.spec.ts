import type { AdaptationPath, AdaptationRelation, MediaItem, MediaType } from "@canonos/contracts";
import type { Page } from "@playwright/test";

import { registerViaUi } from "./helpers/auth";
import { uniqueTitle } from "./helpers/data";
import { expect, test } from "./helpers/fixtures";
import { expectApiJson, waitForApiResponse } from "./helpers/network";

async function createMediaItem(
  page: Page,
  title: string,
  mediaType: MediaType,
  mediaTypeLabel: string,
): Promise<MediaItem> {
  const listResponse = waitForApiResponse(page, "GET", "/api/media-items/", 200);
  await page.goto("/library");
  await listResponse;
  await page.getByRole("button", { name: "Add Media" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Add media" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Title", { exact: true }).fill(title);
  await dialog.getByLabel("Media type").selectOption({ label: mediaTypeLabel });
  await dialog.getByLabel("Status").selectOption({ label: "Planned" });
  await dialog.getByLabel("Creator / director / author").fill("Adaptation E2E");
  await dialog.getByLabel("Notes").fill(`Created as ${mediaType} through adaptation e2e.`);
  const createResponse = waitForApiResponse(page, "POST", "/api/media-items/", 201);
  await dialog.getByRole("button", { name: "Save media" }).click();
  const payload = await expectApiJson<MediaItem>(await createResponse);
  expect(payload.title).toBe(title);
  expect(payload.mediaType).toBe(mediaType);
  await expect(page.getByRole("link", { name: title })).toBeVisible();
  return payload;
}

test.describe("adaptation intelligence browser-to-backend flow", () => {
  test("creates a relation, recommends a path, shows both sides, and deletes the relation", async ({ page }) => {
    await registerViaUi(page);
    const source = await createMediaItem(page, uniqueTitle("E2E Source Novel"), "novel", "Novel");
    const adaptation = await createMediaItem(page, uniqueTitle("E2E Adaptation Show"), "anime", "Anime");

    const detailResponse = waitForApiResponse(page, "GET", `/api/media-items/${source.id}/`, 200);
    await page.goto(`/library/${source.id}`);
    await detailResponse;
    await expect(page.getByRole("heading", { name: source.title })).toBeVisible();

    const relationsResponse = waitForApiResponse(page, "GET", "/api/adaptations/relations/", 200);
    const mapResponse = waitForApiResponse(page, "GET", `/api/media-items/${source.id}/adaptation-map/`, 200);
    await page.getByRole("tab", { name: "Adaptations" }).click();
    await relationsResponse;
    await mapResponse;
    await expect(page.getByText("No adaptation relations yet")).toBeVisible();

    await page.getByRole("button", { name: /^Add adaptation relation$/ }).first().click();
    const dialog = page.getByRole("dialog", { name: "Add adaptation relation" });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Source media").selectOption(source.id);
    await dialog.getByLabel("Adaptation media").selectOption(adaptation.id);
    await dialog.getByLabel("Relation type").selectOption("novel_to_show");
    await dialog.getByLabel("Completeness").selectOption("partial");
    await dialog.getByLabel("Faithfulness score").fill("78");
    await dialog.getByLabel("Pacing preservation score").fill("61");
    await dialog.getByLabel("Soul preservation score").fill("84");
    await dialog.getByLabel("Recommended order").selectOption("read_first");
    await dialog
      .getByLabel("Comparison notes")
      .fill("Strong soul, some compression, and a changed tone in the ending.");

    const createRelationResponse = waitForApiResponse(page, "POST", "/api/adaptations/relations/", 201);
    await dialog.getByRole("button", { name: "Save relation" }).click();
    const relation = await expectApiJson<AdaptationRelation>(await createRelationResponse);
    expect(relation.sourceMediaItemId).toBe(source.id);
    expect(relation.adaptationMediaItemId).toBe(adaptation.id);
    expect(relation.faithfulnessScore).toBe(78);
    await expect(dialog).toBeHidden();
    await expect(page.getByText(`${source.title} → ${adaptation.title}`)).toBeVisible();
    await expect(page.getByText(/Strong soul, some compression/i)).toBeVisible();

    const pathResponse = waitForApiResponse(page, "POST", `/api/media-items/${source.id}/adaptation-path/`, 200);
    await page.getByRole("button", { name: "Get Experience Path" }).click();
    const path = await expectApiJson<AdaptationPath>(await pathResponse);
    expect(path.mediaItemId).toBe(source.id);
    expect(path.relations.map((item) => item.id)).toContain(relation.id);
    expect(["read_first", "source_preferred", "skip_adaptation"]).toContain(
      path.recommendation.recommendation,
    );
    await expect(page.getByText("Best Experience Path")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Risk signals" })).toBeVisible();

    const adaptationDetailResponse = waitForApiResponse(page, "GET", `/api/media-items/${adaptation.id}/`, 200);
    await page.goto(`/library/${adaptation.id}`);
    await adaptationDetailResponse;
    const adaptationRelationsResponse = waitForApiResponse(page, "GET", "/api/adaptations/relations/", 200);
    await page.getByRole("tab", { name: "Adaptations" }).click();
    await adaptationRelationsResponse;
    await expect(page.getByText(`${source.title} → ${adaptation.title}`)).toBeVisible();

    const deleteResponse = waitForApiResponse(
      page,
      "DELETE",
      `/api/adaptations/relations/${relation.id}/`,
      204,
    );
    await page.getByRole("button", { name: "Remove relation" }).click();
    await deleteResponse;
    await expect(page.getByText(`${source.title} → ${adaptation.title}`)).toHaveCount(0);
  });
});
