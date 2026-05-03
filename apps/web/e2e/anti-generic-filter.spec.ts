import type { AntiGenericRule, CandidateEvaluateResponse } from "@canonos/contracts";

import { test, expect } from "./helpers/fixtures";
import { registerViaUi } from "./helpers/auth";
import { uniqueTitle } from "./helpers/data";
import { expectApiJson, waitForApiResponse } from "./helpers/network";

async function evaluateCandidateFromForm(page: import("@playwright/test").Page) {
  const createOrUpdateResponse = waitForApiResponse(page, "POST", "/api/candidates/", 201).catch(() => null);
  const evaluateResponse = waitForApiResponse(page, "POST", /\/api\/candidates\/[^/]+\/evaluate\/$/, 200);
  await page.getByRole("button", { name: "Run Evaluation" }).click();
  await createOrUpdateResponse;
  return expectApiJson<CandidateEvaluateResponse>(await evaluateResponse);
}

async function fillCandidateForm(
  page: import("@playwright/test").Page,
  candidate: {
    title: string;
    mediaType: string;
    releaseYear: string;
    creator: string;
    source: string;
    premise: string;
    hype: string;
    genericness: string;
    timeCost: string;
  },
) {
  await page.getByLabel("Title").fill(candidate.title);
  await page.getByLabel("Media type").selectOption(candidate.mediaType);
  await page.getByLabel("Release year").fill(candidate.releaseYear);
  await page.getByLabel("Known creator").fill(candidate.creator);
  await page.getByLabel("Source of interest").fill(candidate.source);
  await page.getByLabel("Premise / signal notes").fill(candidate.premise);
  await page.getByLabel("Hype level (0-10)").fill(candidate.hype);
  await page.getByLabel("Expected genericness (0-10)").fill(candidate.genericness);
  await page.getByLabel("Expected time cost (minutes)").fill(candidate.timeCost);
}

test.describe("anti-generic filter browser-to-backend flow", () => {
  test("scores red flags, protects modern exceptions, and applies rule changes", async ({ page }) => {
    await registerViaUi(page);

    const highGenericTitle = uniqueTitle("E2E Anti Generic Risk");
    const highGenericCandidate = {
      title: highGenericTitle,
      mediaType: "tv_show",
      releaseYear: "2024",
      creator: "",
      source: "Very high hype",
      premise:
        "A dark gritty mystery box with complex twists, filler episodes, weak ending rumors, and prestige puzzle marketing.",
      hype: "9",
      genericness: "9",
      timeCost: "920",
    };

    const initialListResponse = waitForApiResponse(page, "GET", "/api/candidates/", 200);
    await page.goto("/candidates");
    await initialListResponse;
    await fillCandidateForm(page, highGenericCandidate);

    const firstEvaluation = await evaluateCandidateFromForm(page);
    const firstAntiGeneric = firstEvaluation.evaluation.antiGenericEvaluation;
    expect(firstAntiGeneric?.finalVerdict).toBe("likely_generic_skip");
    expect(firstAntiGeneric?.detectedSignals.map((signal) => signal.ruleKey)).toEqual(
      expect.arrayContaining(["fake_complexity", "filler_heavy_long_series", "overhype_mismatch"]),
    );
    await expect(page.getByRole("heading", { name: "Anti-Generic Filter" })).toBeVisible();
    await expect(page.getByText("Likely generic skip")).toBeVisible();
    await expect(page.getByText("Filler-heavy long series")).toBeVisible();

    const rulesResponse = waitForApiResponse(page, "GET", "/api/anti-generic/rules/", 200);
    await page.goto("/settings");
    const rulesPayload = await expectApiJson<{ results: AntiGenericRule[] }>(await rulesResponse);
    const fillerRule = rulesPayload.results.find((rule) => rule.key === "filler_heavy_long_series");
    expect(fillerRule).toBeDefined();
    const fillerRuleCard = page.locator("article").filter({ hasText: "Filler-heavy long series" });
    await expect(fillerRuleCard.getByLabel("Enabled")).toBeChecked();
    await expect(page.getByText("Recency is never a red flag by itself")).toBeVisible();
    await fillerRuleCard.getByLabel("Enabled").uncheck();
    const saveRuleResponse = waitForApiResponse(
      page,
      "PATCH",
      new RegExp(`/api/anti-generic/rules/${fillerRule!.id}/$`),
      200,
    );
    await fillerRuleCard.getByRole("button", { name: "Save Rule" }).click();
    const savedRule = await expectApiJson<AntiGenericRule>(await saveRuleResponse);
    expect(savedRule.isEnabled).toBe(false);
    await expect(page.getByText(/Saved Filler-heavy long series/)).toBeVisible();

    const candidateReloadResponse = waitForApiResponse(page, "GET", "/api/candidates/", 200);
    await page.goto("/candidates");
    await candidateReloadResponse;
    await page.getByRole("button", { name: new RegExp(highGenericTitle) }).click();
    const patchResponse = waitForApiResponse(page, "PATCH", /\/api\/candidates\/[^/]+\/$/, 200);
    const reevaluateResponse = waitForApiResponse(page, "POST", /\/api\/candidates\/[^/]+\/evaluate\/$/, 200);
    await page.getByRole("button", { name: "Run Evaluation" }).click();
    await patchResponse;
    const reevaluated = await expectApiJson<CandidateEvaluateResponse>(await reevaluateResponse);
    expect(reevaluated.evaluation.antiGenericEvaluation?.detectedSignals.map((signal) => signal.ruleKey)).not.toContain(
      "filler_heavy_long_series",
    );
    await expect(page.getByText("Filler-heavy long series")).toHaveCount(0);

    await page.getByRole("button", { name: "New Candidate" }).first().click();
    const modernTitle = uniqueTitle("E2E Modern Exception");
    await fillCandidateForm(page, {
      title: modernTitle,
      mediaType: "movie",
      releaseYear: "2024",
      creator: "Strong Auteur",
      source: "Niche festival friend signal",
      premise: "Original authorial voice with atmosphere, character agency, distinctive craft, and memorable ending.",
      hype: "3",
      genericness: "2",
      timeCost: "95",
    });
    const modernEvaluation = await evaluateCandidateFromForm(page);
    expect(modernEvaluation.evaluation.antiGenericEvaluation?.finalVerdict).toBe("modern_exception");
    expect(modernEvaluation.evaluation.antiGenericEvaluation?.positiveExceptions.map((signal) => signal.ruleKey)).toEqual(
      expect.arrayContaining(["auteur_driven_modern_work", "low_popularity_strong_fit"]),
    );
    await expect(page.getByText("Modern exception")).toBeVisible();
    await expect(page.getByText("Auteur-driven modern work")).toBeVisible();
  });
});
