import type { Page } from "@playwright/test";

import { test, expect } from "./helpers/fixtures";
import { registerViaUi } from "./helpers/auth";
import { uniqueTitle } from "./helpers/data";
import { expectApiJson, waitForApiResponse } from "./helpers/network";

async function addQueueItem(page: Page, title: string, priority: "Start Soon" | "Sample First", minutes: string, reason: string) {
  await page.goto("/queue");
  await page.getByRole("button", { name: "Add Queue Item" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Add Queue Item" });
  await dialog.getByLabel("Title", { exact: true }).fill(title);
  await dialog.getByLabel("Priority").selectOption({ label: priority });
  await dialog.getByLabel("Estimated time (minutes)").fill(minutes);
  await dialog.getByLabel("Best mood").fill("Focused evening");
  await dialog.getByLabel("Reason").fill(reason);
  const createResponse = waitForApiResponse(page, "POST", "/api/queue-items/", 201);
  await dialog.getByRole("button", { name: "Save" }).click();
  await createResponse;
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
}

async function addPlannedMedia(page: Page, title: string) {
  await page.goto("/library");
  await page.getByRole("button", { name: "Add Media" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Add media" });
  await dialog.getByLabel("Title", { exact: true }).fill(title);
  await dialog.getByLabel("Media type").selectOption({ label: "Novel" });
  await dialog.getByLabel("Status").selectOption({ label: "Planned" });
  await dialog.getByLabel("Page count").fill("45");
  await dialog.getByLabel("Notes").fill("Deep literary wildcard for a focused night.");
  const createResponse = waitForApiResponse(page, "POST", "/api/media-items/", 201);
  await dialog.getByRole("button", { name: "Save media" }).click();
  await createResponse;
  await expect(page.getByText(title)).toBeVisible();
}

test.describe("Tonight Mode browser-to-backend flow", () => {
  test("generates recommendations and acts on start, not tonight, and add-to-queue controls", async ({ page }) => {
    await registerViaUi(page);
    const safeTitle = uniqueTitle("E2E Tonight Safe Film");
    const challengingTitle = uniqueTitle("E2E Tonight Risky Anime");
    const plannedTitle = uniqueTitle("E2E Tonight Planned Novel");

    await addQueueItem(page, safeTitle, "Start Soon", "95", "High quality safe choice for tonight.");
    await addQueueItem(page, challengingTitle, "Sample First", "24", "Surprising weird sample for risk tolerance.");
    await addPlannedMedia(page, plannedTitle);

    await page.goto("/tonight");
    await page.getByLabel("Available time (minutes)").fill("120");
    await page.getByLabel("Focus level").selectOption({ label: "Deep" });
    await page.getByLabel("Desired effect").selectOption({ label: "Deep" });

    const generateResponsePromise = waitForApiResponse(page, "POST", "/api/queue/tonight/", 201);
    await page.getByRole("button", { name: "Generate Tonight Plan" }).click();
    const generateResponse = await generateResponsePromise;
    const payload = await expectApiJson<{
      recommendations: { title: string; slot: string }[];
      safeChoice: { title: string } | null;
      challengingChoice: { title: string } | null;
      wildcardChoice: { title: string } | null;
    }>(generateResponse);

    expect(payload.recommendations.length).toBeGreaterThanOrEqual(3);
    expect(payload.safeChoice?.title).toBe(safeTitle);
    expect(payload.challengingChoice?.title).toBe(challengingTitle);
    expect(payload.wildcardChoice?.title).toBe(plannedTitle);
    await expect(page.getByText("Tonight Mode plan generated.")).toBeVisible();
    await expect(page.getByRole("heading", { name: safeTitle })).toBeVisible();
    await expect(page.getByRole("heading", { name: challengingTitle })).toBeVisible();
    await expect(page.getByRole("heading", { name: plannedTitle })).toBeVisible();

    const plannedCard = page.locator("article").filter({ hasText: plannedTitle });
    const addToQueueResponse = waitForApiResponse(page, "POST", "/api/queue-items/", 201);
    await plannedCard.getByRole("button", { name: "Add To Queue" }).click();
    await addToQueueResponse;
    await expect(page.getByText(`${plannedTitle} added to queue.`)).toBeVisible();

    const startResponse = waitForApiResponse(page, "PATCH", /\/api\/media-items\/[^/]+\/$/, 200);
    await plannedCard.getByRole("button", { name: "Start This" }).click();
    await startResponse;
    await expect(page.getByText(`${plannedTitle} is now marked as consuming.`)).toBeVisible();

    const safeCard = page.locator("article").filter({ hasText: safeTitle });
    const notTonightResponse = waitForApiResponse(page, "PATCH", /\/api\/queue-items\/[^/]+\/$/, 200);
    await safeCard.getByRole("button", { name: "Not Tonight" }).click();
    await notTonightResponse;
    await expect(page.getByText(`${safeTitle} moved to Later.`)).toBeVisible();
  });

  test("shows an empty state when no queue or planned media fits", async ({ page }) => {
    await registerViaUi(page);
    await page.goto("/tonight");
    const generateResponse = waitForApiResponse(page, "POST", "/api/queue/tonight/", 201);
    await page.getByRole("button", { name: "Generate Tonight Plan" }).click();
    await generateResponse;
    await expect(page.getByText("No Tonight Mode recommendations yet")).toBeVisible();
  });
});
