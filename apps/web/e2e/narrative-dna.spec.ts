import type { CandidateEvaluateResponse, NarrativeAnalysisResult } from "@canonos/contracts";

import { test, expect } from "./helpers/fixtures";
import { registerViaUi } from "./helpers/auth";
import { uniqueTitle } from "./helpers/data";
import { expectApiJson, waitForApiResponse } from "./helpers/network";

async function createMediaWithNotes(page: import("@playwright/test").Page, title: string) {
  const listResponse = waitForApiResponse(page, "GET", "/api/media-items/", 200);
  await page.goto("/library");
  await listResponse;

  await page.getByRole("button", { name: "Add Media" }).first().click();
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page.getByLabel("Creator / director / author").fill("Narrative E2E Creator");
  await page.getByLabel("Release year").fill("1979");
  await page.getByLabel("Personal rating").fill("9.2");
  await page.getByLabel("Notes").fill("Atmosphere, moral ambiguity, character agency, and spiritual theme.");

  const createResponse = waitForApiResponse(page, "POST", "/api/media-items/", 201);
  await page.getByRole("button", { name: "Save media" }).click();
  await createResponse;
  await expect(page.getByRole("link", { name: title })).toBeVisible();

  const detailResponse = waitForApiResponse(page, "GET", /\/api\/media-items\/[^/]+\/$/, 200);
  const narrativeListResponse = waitForApiResponse(page, "GET", "/api/narrative-analyses/", 200);
  await page.getByRole("link", { name: title }).click();
  await detailResponse;
  await narrativeListResponse;
}

test.describe("Narrative DNA browser-to-backend flow", () => {
  test("requests media analysis and feeds candidate evaluation narrative signals", async ({ page }) => {
    await registerViaUi(page);
    const mediaTitle = uniqueTitle("E2E Narrative Media");
    const candidateTitle = uniqueTitle("E2E Narrative Candidate");

    await createMediaWithNotes(page, mediaTitle);
    await page.getByRole("tab", { name: "Narrative DNA" }).click();
    await expect(page.getByText("No Narrative DNA yet")).toBeVisible();
    await page.getByLabel("Narrative analysis notes").fill(
      "A haunting atmosphere-driven work with character agency, memory, theme, and moral ambiguity.",
    );

    const postResponse = waitForApiResponse(page, "POST", /\/api\/media-items\/[^/]+\/narrative-analysis\/$/, 201);
    const refreshResponse = waitForApiResponse(page, "GET", "/api/narrative-analyses/", 200);
    await page.getByRole("button", { name: "Request Narrative Analysis" }).click();
    const analysisPayload = await expectApiJson<NarrativeAnalysisResult>(await postResponse);
    expect(analysisPayload.status).toBe("completed");
    expect(analysisPayload.extractedTraits.length).toBeGreaterThan(0);
    await refreshResponse;
    await expect(page.getByText(/This is a .* confidence Narrative DNA estimate/i)).toBeVisible();
    await expect(page.getByText(/Basis:/i)).toBeVisible();

    const candidateListResponse = waitForApiResponse(page, "GET", "/api/candidates/", 200);
    await page.goto("/candidates");
    await candidateListResponse;
    await page.getByLabel("Title").fill(candidateTitle);
    await page.getByLabel("Premise / signal notes").fill(
      "A haunting atmosphere-driven character study about memory and identity.",
    );
    await page.getByLabel("Expected genericness (0-10)").fill("2");
    const createCandidateResponse = waitForApiResponse(page, "POST", "/api/candidates/", 201);
    const evaluateResponse = waitForApiResponse(page, "POST", /\/api\/candidates\/[^/]+\/evaluate\/$/, 200);
    await page.getByRole("button", { name: "Run Evaluation" }).click();
    await createCandidateResponse;
    const evaluationPayload = await expectApiJson<CandidateEvaluateResponse>(await evaluateResponse);

    expect(evaluationPayload.evaluation.narrativeSignals.length).toBeGreaterThan(0);
    await expect(page.getByRole("heading", { name: "Narrative DNA signals" })).toBeVisible();
  });
});
