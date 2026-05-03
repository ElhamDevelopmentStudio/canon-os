import type { Page } from "@playwright/test";

import { test, expect } from "./helpers/fixtures";
import { registerViaUi } from "./helpers/auth";
import { uniqueTitle } from "./helpers/data";
import { expectApiJson, waitForApiResponse } from "./helpers/network";
import type { QueueRecalculateResponse, TonightModeResponse } from "@canonos/contracts";

async function addQueueItem(
  page: Page,
  title: string,
  priority = "Start Soon",
  minutes = "95",
  reason = "Queue item created by browser e2e.",
) {
  await page.getByRole("button", { name: "Add Queue Item" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Add Queue Item" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Title", { exact: true }).fill(title);
  await dialog.getByLabel("Priority").selectOption({ label: priority });
  await dialog.getByLabel("Best mood").fill("Focused evening");
  await dialog.getByLabel("Estimated time (minutes)").fill(minutes);
  await dialog.getByLabel("Reason").fill(reason);
  const createResponse = waitForApiResponse(page, "POST", "/api/queue-items/", 201);
  await page.getByRole("button", { name: "Save" }).click();
  await createResponse;
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
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
    await expect(page.getByRole("heading", { name: updatedFirstTitle })).toBeVisible();

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
    await expect(page.getByRole("heading", { name: updatedFirstTitle })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: secondTitle })).toBeVisible();
  });

  test("recalculates priority, archives fatigued items, restores them, and keeps archive out of Tonight Mode", async ({ page }) => {
    await registerViaUi(page);
    const strongTitle = uniqueTitle("E2E Queue Strong Short");
    const staleTitle = uniqueTitle("E2E Queue Stale Marathon");

    const listResponse = waitForApiResponse(page, "GET", "/api/queue-items/", 200);
    await page.goto("/queue");
    await listResponse;

    await addQueueItem(page, strongTitle, "Start Soon", "45", "Focused quality comfort option.");
    await addQueueItem(page, staleTitle, "Delay / Archive", "900", "Wrong mood fatigue delay for a long commitment.");

    const recalculateResponsePromise = waitForApiResponse(page, "POST", "/api/queue-items/recalculate/", 200);
    await page.getByRole("button", { name: "Recalculate Queue" }).click();
    const recalculatePayload = await expectApiJson<QueueRecalculateResponse>(await recalculateResponsePromise);
    expect(recalculatePayload.summary.archivedCount).toBeGreaterThanOrEqual(1);
    expect(recalculatePayload.scores.find((score) => score.itemId === recalculatePayload.results.find((item) => item.title === staleTitle)?.id)?.isArchived).toBe(true);
    await expect(page.getByText("Queue recalculated with mood fit, freshness, and commitment cost.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Low-priority archive" })).toBeVisible();

    await page.goto("/tonight");
    await page.getByLabel("Available time (minutes)").fill("1000");
    const generateResponsePromise = waitForApiResponse(page, "POST", "/api/queue/tonight/", 201);
    await page.getByRole("button", { name: "Generate Tonight Plan" }).click();
    const tonightPayload = await expectApiJson<TonightModeResponse>(await generateResponsePromise);
    expect(tonightPayload.recommendations.map((recommendation) => recommendation.title)).toContain(strongTitle);
    expect(tonightPayload.recommendations.map((recommendation) => recommendation.title)).not.toContain(staleTitle);

    await page.goto("/queue");
    const archiveCard = page.locator("article").filter({ hasText: staleTitle });
    const restoreResponse = waitForApiResponse(page, "PATCH", /\/api\/queue-items\/[^/]+\/$/, 200);
    await archiveCard.getByRole("button", { name: "Restore" }).click();
    await restoreResponse;
    await expect(page.getByText(`${staleTitle} restored to Sample First.`)).toBeVisible();
  });
});
