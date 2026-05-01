import type { Page } from "@playwright/test";

import { test, expect } from "./helpers/fixtures";
import { registerViaUi } from "./helpers/auth";
import { uniqueTitle } from "./helpers/data";
import { expectApiJson, waitForApiResponse } from "./helpers/network";

async function createCompletedMedia(page: Page, title: string): Promise<string> {
  await page.goto("/library");
  await page.getByRole("button", { name: "Add Media" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Add media" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Title", { exact: true }).fill(title);
  await dialog.getByLabel("Status").selectOption({ label: "Completed" });
  await dialog.getByLabel("Creator / director / author").fill("E2E Director");
  await dialog.getByLabel("Personal rating").fill("8.7");
  await dialog.getByLabel("Runtime minutes").fill("111");
  await dialog.getByLabel("Notes").fill("Media item for aftertaste e2e.");
  const createResponse = waitForApiResponse(page, "POST", "/api/media-items/", 201);
  await page.getByRole("button", { name: "Save media" }).click();
  const response = await createResponse;
  const payload = await expectApiJson<{ id: string; title: string }>(response);
  expect(payload.title).toBe(title);
  await expect(page.getByRole("link", { name: title })).toBeVisible();
  return payload.id;
}

test.describe("aftertaste log browser-to-backend flow", () => {
  test("creates, edits, shows on media detail, and deletes aftertaste entries", async ({ page }) => {
    await registerViaUi(page);
    const mediaTitle = uniqueTitle("E2E Aftertaste Media");
    const mediaId = await createCompletedMedia(page, mediaTitle);

    const listResponse = waitForApiResponse(page, "GET", "/api/aftertaste/", 200);
    const promptsResponse = waitForApiResponse(page, "GET", "/api/aftertaste/prompts/", 200);
    await page.goto("/aftertaste-log");
    await listResponse;
    await promptsResponse;
    await expect(page.getByText("No aftertaste entries yet")).toBeVisible();
    await expect(page.getByText("Was it worth the time?")).toBeVisible();

    await page.getByRole("button", { name: "New Reflection" }).first().click();
    const createDialog = page.getByRole("dialog", { name: "New Reflection" });
    await expect(createDialog).toBeVisible();
    await createDialog.getByLabel("Media item").selectOption({ label: mediaTitle });
    await createDialog.getByLabel("Worth time").selectOption({ label: "Yes" });
    await createDialog.getByLabel("Stayed with me score").fill("9");
    await createDialog.getByLabel("Felt alive").selectOption({ label: "Yes" });
    await createDialog.getByLabel("Felt generic").selectOption({ label: "No" });
    await createDialog.getByLabel("Completion reason").fill("Completed after a focused evening");
    await createDialog.getByLabel("What worked").fill("The ending and atmosphere kept echoing.");
    await createDialog.getByLabel("What failed").fill("A few middle scenes dragged.");
    await createDialog.getByLabel("Final thoughts").fill("This aftertaste stayed bright overnight.");
    await createDialog.getByLabel("Appetite effect").selectOption({ label: "More like this" });
    const createAftertasteResponse = waitForApiResponse(page, "POST", "/api/aftertaste/", 201);
    await page.getByRole("button", { name: "Save reflection" }).click();
    const aftertasteResponse = await createAftertasteResponse;
    const aftertastePayload = await expectApiJson<{ id: string; mediaItemId: string; finalThoughts: string }>(aftertasteResponse);
    expect(aftertastePayload.mediaItemId).toBe(mediaId);
    expect(aftertastePayload.finalThoughts).toBe("This aftertaste stayed bright overnight.");
    await expect(page.getByText("Aftertaste entry saved.")).toBeVisible();
    await expect(page.getByRole("heading", { name: mediaTitle })).toBeVisible();
    await expect(page.getByText("Stayed 9/10")).toBeVisible();

    await page.getByRole("button", { name: `Edit reflection for ${mediaTitle}` }).click();
    const editDialog = page.getByRole("dialog", { name: "Edit Reflection" });
    await expect(editDialog).toBeVisible();
    await editDialog.getByLabel("Stayed with me score").fill("10");
    await editDialog.getByLabel("Felt generic").selectOption({ label: "Yes" });
    await editDialog.getByLabel("Final thoughts").fill("Edited aftertaste: sharper and more suspicious of genericness.");
    const updateResponse = waitForApiResponse(page, "PATCH", /\/api\/aftertaste\/[^/]+\/$/, 200);
    await page.getByRole("button", { name: "Save reflection" }).click();
    await updateResponse;
    await expect(page.getByText("Aftertaste entry updated.")).toBeVisible();
    await expect(page.getByText("Stayed 10/10")).toBeVisible();
    await expect(page.getByText("Edited aftertaste: sharper and more suspicious of genericness.")).toBeVisible();

    const detailResponse = waitForApiResponse(page, "GET", `/api/media-items/${mediaId}/`, 200);
    await page.goto(`/library/${mediaId}`);
    await detailResponse;
    await expect(page.getByRole("heading", { name: mediaTitle })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Latest reflection" })).toBeVisible();
    await expect(page.getByText("Edited aftertaste: sharper and more suspicious of genericness.")).toBeVisible();

    await page.goto("/aftertaste-log");
    await expect(page.getByRole("heading", { name: mediaTitle })).toBeVisible();
    await page.getByRole("button", { name: `Delete reflection for ${mediaTitle}` }).click();
    await expect(page.getByRole("dialog", { name: "Delete aftertaste entry?" })).toBeVisible();
    const deleteResponse = waitForApiResponse(page, "DELETE", `/api/aftertaste/${aftertastePayload.id}/`, 204);
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await deleteResponse;
    await expect(page.getByText("Aftertaste entry deleted.")).toBeVisible();
    await expect(page.getByText("No aftertaste entries yet")).toBeVisible();
  });
});
