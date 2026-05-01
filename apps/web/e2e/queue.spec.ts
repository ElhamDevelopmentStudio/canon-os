import type { Page } from "@playwright/test";

import { test, expect } from "./helpers/fixtures";
import { registerViaUi } from "./helpers/auth";
import { uniqueTitle } from "./helpers/data";
import { waitForApiResponse } from "./helpers/network";

async function addQueueItem(page: Page, title: string, priority = "Start Soon") {
  await page.getByRole("button", { name: "Add Queue Item" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Add Queue Item" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Title", { exact: true }).fill(title);
  await dialog.getByLabel("Priority").selectOption({ label: priority });
  await dialog.getByLabel("Best mood").fill("Focused evening");
  await dialog.getByLabel("Estimated time (minutes)").fill("95");
  await dialog.getByLabel("Reason").fill("Queue item created by browser e2e.");
  const createResponse = waitForApiResponse(page, "POST", "/api/queue-items/", 201);
  await page.getByRole("button", { name: "Save" }).click();
  await createResponse;
  await expect(page.getByText(title)).toBeVisible();
}

test.describe("adaptive queue browser-to-backend flow", () => {
  test("creates, lists, edits, reorders, and deletes queue items", async ({ page }) => {
    await registerViaUi(page);
    const firstTitle = uniqueTitle("E2E Queue First");
    const secondTitle = uniqueTitle("E2E Queue Second");
    const updatedFirstTitle = `${firstTitle} Updated`;

    const listResponse = waitForApiResponse(page, "GET", "/api/queue-items/", 200);
    await page.goto("/queue");
    await listResponse;
    await expect(page.getByText("No queue items match this view")).toBeVisible();

    await addQueueItem(page, firstTitle);
    await addQueueItem(page, secondTitle);

    await page.getByRole("button", { name: `Edit ${firstTitle}` }).click();
    const editDialog = page.getByRole("dialog", { name: "Edit Queue Item" });
    await expect(editDialog).toBeVisible();
    await editDialog.getByLabel("Title", { exact: true }).fill(updatedFirstTitle);
    const updateResponse = waitForApiResponse(page, "PATCH", /\/api\/queue-items\/[^/]+\/$/, 200);
    await page.getByRole("button", { name: "Save" }).click();
    await updateResponse;
    await expect(page.getByText(updatedFirstTitle)).toBeVisible();

    const reorderResponse = waitForApiResponse(page, "POST", "/api/queue-items/reorder/", 200);
    await page.getByRole("button", { name: `Move ${secondTitle} up` }).click();
    await reorderResponse;
    await expect(page.getByText("Queue order updated.")).toBeVisible();

    await page.getByRole("button", { name: `Remove ${updatedFirstTitle}` }).click();
    await expect(page.getByRole("dialog", { name: "Remove queue item?" })).toBeVisible();
    const deleteResponse = waitForApiResponse(page, "DELETE", /\/api\/queue-items\/[^/]+\/$/, 204);
    await page.getByRole("button", { name: "Remove", exact: true }).click();
    await deleteResponse;
    await expect(page.getByText("Queue item removed.")).toBeVisible();
    await expect(page.getByText(updatedFirstTitle)).toHaveCount(0);
    await expect(page.getByText(secondTitle)).toBeVisible();
  });
});
