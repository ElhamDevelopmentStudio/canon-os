import type { Page } from "@playwright/test";

import { test, expect } from "./helpers/fixtures";
import { registerViaUi } from "./helpers/auth";
import { uniqueTitle, uniqueUser } from "./helpers/data";
import { waitForApiResponse } from "./helpers/network";

async function openAddMedia(page: Page) {
  await page.getByRole("button", { name: "Add Media" }).first().click();
  await expect(page.getByRole("dialog", { name: "Add media" })).toBeVisible();
}

test.describe("media library browser-to-backend flow", () => {
  test("creates, lists, edits, scores, and deletes a media item", async ({ page }) => {
    await registerViaUi(page);
    const title = uniqueTitle("E2E Media");
    const updatedTitle = `${title} Updated`;

    const initialListResponse = waitForApiResponse(page, "GET", "/api/media-items/", 200);
    await page.goto("/library");
    await initialListResponse;

    await openAddMedia(page);
    await page.getByLabel("Title", { exact: true }).fill(title);
    await page.getByLabel("Creator / director / author").fill("E2E Director");
    await page.getByLabel("Release year").fill("2001");
    await page.getByLabel("Personal rating").fill("8.4");
    await page.getByLabel("Notes").fill("Created through real browser e2e.");

    const createResponse = waitForApiResponse(page, "POST", "/api/media-items/", 201);
    await page.getByRole("button", { name: "Save media" }).click();
    await createResponse;
    await expect(page.getByRole("link", { name: title })).toBeVisible();

    await page.getByRole("button", { name: `Edit ${title}` }).click();
    await expect(page.getByRole("dialog", { name: "Edit media" })).toBeVisible();
    await page.getByLabel("Title", { exact: true }).fill(updatedTitle);
    const updateResponse = waitForApiResponse(page, "PATCH", /\/api\/media-items\/[^/]+\/$/, 200);
    await page.getByRole("button", { name: "Save media" }).click();
    await updateResponse;
    await expect(page.getByRole("link", { name: updatedTitle })).toBeVisible();

    const detailResponse = waitForApiResponse(page, "GET", /\/api\/media-items\/[^/]+\/$/, 200);
    await page.getByRole("link", { name: updatedTitle }).click();
    await detailResponse;
    await expect(page.getByRole("heading", { name: updatedTitle })).toBeVisible();

    await page.getByRole("spinbutton", { name: "Score" }).first().fill("8.8");
    await page.getByRole("textbox", { name: "Score note" }).first().fill("Strong E2E taste signal.");
    const scoreResponse = waitForApiResponse(page, "PUT", /\/api\/media-items\/[^/]+\/scores\/$/, 200);
    await page.getByRole("button", { name: "Save scores" }).click();
    await scoreResponse;

    await page.getByRole("link", { name: "Back to Library" }).click();
    await expect(page).toHaveURL("/library");
    const deleteResponse = waitForApiResponse(page, "DELETE", /\/api\/media-items\/[^/]+\/$/, 204);
    await page.getByRole("button", { name: `Delete ${updatedTitle}` }).click();
    await expect(page.getByRole("dialog", { name: "Delete media item?" })).toBeVisible();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await deleteResponse;
    await expect(page).toHaveURL("/library");
    await expect(page.getByRole("link", { name: updatedTitle })).toHaveCount(0);
  });

  test("does not show another authenticated user's media items", async ({ page }) => {
    const ownedTitle = uniqueTitle("Private Media");
    await registerViaUi(page, uniqueUser("owner"));
    await page.goto("/library");
    await openAddMedia(page);
    await page.getByLabel("Title", { exact: true }).fill(ownedTitle);
    const createResponse = waitForApiResponse(page, "POST", "/api/media-items/", 201);
    await page.getByRole("button", { name: "Save media" }).click();
    await createResponse;
    await expect(page.getByRole("link", { name: ownedTitle })).toBeVisible();

    await page.context().clearCookies();
    await registerViaUi(page, uniqueUser("other"));
    const listResponse = waitForApiResponse(page, "GET", "/api/media-items/", 200);
    await page.goto("/library");
    await listResponse;

    await expect(page.getByRole("link", { name: ownedTitle })).toHaveCount(0);
    await expect(page.getByText("No media items match this view")).toBeVisible();
  });
});
