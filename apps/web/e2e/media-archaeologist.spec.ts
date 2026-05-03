import type { DiscoveryGenerateResponse, DiscoveryTrail, QueueItem } from "@canonos/contracts";

import { registerViaUi } from "./helpers/auth";
import { test, expect } from "./helpers/fixtures";
import { expectApiJson, waitForApiResponse } from "./helpers/network";

function expectDiscoveryResults(payload: DiscoveryGenerateResponse): void {
  expect(payload.results.length).toBeGreaterThan(0);
  for (const result of payload.results) {
    expect(result.discoveryScore).toBeGreaterThan(0);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.expansionRationale.length).toBeGreaterThan(0);
    expect(result.riskRationale.length).toBeGreaterThan(0);
  }
}

test.describe("media archaeologist browser-to-backend flow", () => {
  test("generates deep-cut trails, saves them, and adds a result to the queue", async ({ page }) => {
    await registerViaUi(page);

    const listResponse = waitForApiResponse(page, "GET", "/api/discovery/trails/", 200);
    await page.goto("/discover");
    await listResponse;
    await expect(page.getByRole("heading", { name: "Media Archaeologist" })).toBeVisible();

    const unfilteredResponse = waitForApiResponse(page, "POST", "/api/discovery/generate/", 200);
    await page.getByRole("button", { name: "Generate Discovery Trail" }).click();
    const unfilteredPayload = await expectApiJson<DiscoveryGenerateResponse>(await unfilteredResponse);
    expectDiscoveryResults(unfilteredPayload);
    await expect(page.getByText("Discovery trail generated.")).toBeVisible();

    await page.getByLabel("Theme", { exact: true }).fill("memory and identity");
    await page.getByLabel("Mood", { exact: true }).fill("patient");
    await page.getByLabel("Preferred medium", { exact: true }).selectOption({ label: "Novel" });
    const filteredResponse = waitForApiResponse(page, "POST", "/api/discovery/generate/", 200);
    await page.getByRole("button", { name: "Generate Discovery Trail" }).click();
    const filteredPayload = await expectApiJson<DiscoveryGenerateResponse>(await filteredResponse);
    expectDiscoveryResults(filteredPayload);
    expect(filteredPayload.results.every((result) => result.mediaType === "novel")).toBe(true);
    const firstResult = filteredPayload.results[0];
    await expect(page.getByRole("heading", { name: firstResult.title })).toBeVisible();
    await expect(page.getByText("Why this expands your taste").first()).toBeVisible();
    await expect(page.getByText("Why it may fail").first()).toBeVisible();

    const saveResponse = waitForApiResponse(page, "POST", "/api/discovery/trails/", 201);
    await page.getByRole("button", { name: "Save Trail" }).click();
    const savedTrail = await expectApiJson<DiscoveryTrail>(await saveResponse);
    expect(savedTrail.resultItems.length).toBe(filteredPayload.results.length);
    await expect(page.getByText("Discovery trail saved.")).toBeVisible();
    await expect(
      page.getByLabel("Saved discovery trails").getByRole("heading", { name: savedTrail.name }),
    ).toBeVisible();

    const resultCard = page.locator("article").filter({ hasText: firstResult.title }).first();
    const queueResponse = waitForApiResponse(page, "POST", "/api/queue-items/", 201);
    await resultCard.getByRole("button", { name: "Add To Queue" }).click();
    const queuePayload = await expectApiJson<QueueItem>(await queueResponse);
    expect(queuePayload.title).toBe(firstResult.title);
    expect(queuePayload.mediaType).toBe("novel");
    expect(queuePayload.priority).toBe("sample_first");
    await expect(page.getByText(`Added “${firstResult.title}” to the queue.`)).toBeVisible();
  });
});
