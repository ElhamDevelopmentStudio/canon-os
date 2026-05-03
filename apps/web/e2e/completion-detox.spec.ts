import type { Page } from "@playwright/test";
import type { DetoxEvaluateResponse } from "@canonos/contracts";

import { registerViaUi } from "./helpers/auth";
import { uniqueTitle } from "./helpers/data";
import { expect, test } from "./helpers/fixtures";
import { expectApiJson, waitForApiResponse } from "./helpers/network";

async function createConsumingShow(page: Page, title: string) {
  const listResponse = waitForApiResponse(page, "GET", "/api/media-items/", 200);
  await page.goto("/library");
  await listResponse;
  await page.getByRole("button", { name: "Add Media" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Add media" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Title", { exact: true }).fill(title);
  await dialog.getByLabel("Status").selectOption({ label: "Consuming" });
  await dialog.getByLabel("Media type").selectOption({ label: "TV show" });
  await dialog.getByLabel("Episode count").fill("12");
  await dialog.getByLabel("Personal rating").fill("4.0");
  const createResponse = waitForApiResponse(page, "POST", "/api/media-items/", 201);
  await dialog.getByRole("button", { name: "Save media" }).click();
  const payload = await expectApiJson<{ id: string; title: string }>(await createResponse);
  await expect(page.getByRole("link", { name: title })).toBeVisible();
  return payload;
}

test.describe("completion detox browser-to-backend flow", () => {
  test("evaluates drop decisions, tracks time saved, updates media status, and respects disabled rules", async ({ page }) => {
    await registerViaUi(page);
    const firstShow = await createConsumingShow(page, uniqueTitle("E2E Detox Low Pull"));
    const secondShow = await createConsumingShow(page, uniqueTitle("E2E Detox Rule Disabled"));

    const rulesResponse = waitForApiResponse(page, "GET", "/api/detox/rules/", 200);
    const summaryResponse = waitForApiResponse(page, "GET", "/api/detox/time-saved/", 200);
    const decisionsResponse = waitForApiResponse(page, "GET", "/api/detox/decisions/", 200);
    const mediaResponse = waitForApiResponse(page, "GET", "/api/media-items/", 200);
    await page.goto("/completion-detox");
    const rules = await expectApiJson<{ results: { id: string; key: string; isEnabled: boolean }[] }>(await rulesResponse);
    await summaryResponse;
    await decisionsResponse;
    await mediaResponse;
    const tvRule = rules.results.find((rule) => rule.key === "tv_two_episode_sample");
    expect(tvRule?.isEnabled).toBe(true);

    await page.getByLabel("Media item").selectOption({ label: firstShow.title });
    await page.getByLabel("Current progress").fill("2");
    await page.getByLabel("Current motivation").fill("2");
    const evaluateResponse = waitForApiResponse(page, "POST", "/api/detox/evaluate/", 201);
    await page.getByRole("button", { name: "Evaluate Drop/Pause" }).click();
    const evaluated = await expectApiJson<DetoxEvaluateResponse>(await evaluateResponse);
    expect(evaluated.decision.decision).toBe("drop");
    expect(evaluated.decision.estimatedTimeSavedMinutes).toBe(450);
    await expect(page.getByRole("heading", { name: "Detox decision result" })).toBeVisible();
    await expect(page.getByLabel("Detox decision result").getByText(/dropping is a practical option/i)).toBeVisible();
    await expect(page.getByText("7h 30m").first()).toBeVisible();

    const markDroppedResponse = waitForApiResponse(page, "PATCH", `/api/media-items/${firstShow.id}/`, 200);
    await page.getByRole("button", { name: "Mark As Dropped" }).click();
    const dropped = await expectApiJson<{ status: string }>(await markDroppedResponse);
    expect(dropped.status).toBe("dropped");
    await expect(page.getByText(new RegExp(`${firstShow.title} marked as dropped`, "i"))).toBeVisible();

    const rulePatchResponse = waitForApiResponse(page, "PATCH", new RegExp(`/api/detox/rules/${tvRule!.id}/$`), 200);
    await page.getByRole("button", { name: "Disable TV two episode sample" }).click();
    const patchedRule = await expectApiJson<{ isEnabled: boolean }>(await rulePatchResponse);
    expect(patchedRule.isEnabled).toBe(false);

    await page.getByLabel("Media item").selectOption({ label: secondShow.title });
    await page.getByLabel("Current progress").fill("2");
    await page.getByLabel("Current motivation").fill("2");
    const disabledEvaluateResponse = waitForApiResponse(page, "POST", "/api/detox/evaluate/", 201);
    await page.getByRole("button", { name: "Evaluate Drop/Pause" }).click();
    const disabledEvaluation = await expectApiJson<DetoxEvaluateResponse>(await disabledEvaluateResponse);
    expect(disabledEvaluation.decision.decision).toBe("continue");
    expect(disabledEvaluation.matchedRule).toBeNull();
    await expect(page.getByLabel("Detox decision result").getByText(/no active sample boundary has been reached/i)).toBeVisible();
  });
});
