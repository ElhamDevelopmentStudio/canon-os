import type { CouncilApplyResponse, CouncilSession, CriticPersona } from "@canonos/contracts";

import { test, expect } from "./helpers/fixtures";
import { registerViaUi } from "./helpers/auth";
import { uniqueTitle } from "./helpers/data";
import { expectApiJson, waitForApiResponse } from "./helpers/network";

async function createCandidate(page: import("@playwright/test").Page, title: string): Promise<string> {
  const candidateListResponse = waitForApiResponse(page, "GET", "/api/candidates/", 200);
  await page.goto("/candidates");
  await candidateListResponse;
  await page.getByLabel("Title").fill(title);
  await page.getByRole("button", { name: /more context/i }).click();
  await page.getByLabel("Known creator").fill("Critic Council Auteur");
  await page.getByLabel("Release year").fill("2024");
  await page.getByLabel("Premise").fill(
    "A distinctive modern work with atmosphere, character agency, and enough originality to debate fairly.",
  );
  await page.getByLabel("Expected genericness").fill("2");
  await page.getByLabel("Expected time cost").fill("105");

  const createResponse = waitForApiResponse(page, "POST", "/api/candidates/", 201);
  await page.getByRole("button", { name: "Save Candidate" }).click();
  const payload = await expectApiJson<{ id: string }>(await createResponse);
  await expect(page.getByText("Candidate saved to evaluator history.")).toBeVisible();
  return payload.id;
}

async function createMedia(page: import("@playwright/test").Page, title: string): Promise<string> {
  const listResponse = waitForApiResponse(page, "GET", "/api/media-items/", 200);
  await page.goto("/library");
  await listResponse;
  await page.getByRole("button", { name: "Add Media" }).first().click();
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page.getByLabel("Media type", { exact: true }).selectOption("anime");
  await page.getByLabel("Creator / director / author").fill("Critic Council Studio");
  await page.getByLabel("Release year").fill("1998");
  await page.getByLabel("Notes").fill("Atmosphere, identity, pacing risk, and source-material questions.");

  const createResponse = waitForApiResponse(page, "POST", "/api/media-items/", 201);
  await page.getByRole("button", { name: "Save media" }).click();
  const payload = await expectApiJson<{ id: string }>(await createResponse);
  await expect(page.getByRole("link", { name: title })).toBeVisible();
  return payload.id;
}

test.describe("Critic Council browser-to-backend flow", () => {
  test("runs candidate and media debates, disables a critic, and applies the final decision", async ({ page }) => {
    await registerViaUi(page);
    const candidateTitle = uniqueTitle("E2E Council Candidate");
    const mediaTitle = uniqueTitle("E2E Council Media");

    const candidateId = await createCandidate(page, candidateTitle);
    const mediaItemId = await createMedia(page, mediaTitle);

    const personasResponse = waitForApiResponse(page, "GET", "/api/critic-personas/", 200);
    const sessionsResponse = waitForApiResponse(page, "GET", "/api/council-sessions/", 200);
    await page.goto("/critic-council");
    const personasPayload = await expectApiJson<{ results: CriticPersona[] }>(await personasResponse);
    await sessionsResponse;
    expect(personasPayload.results.map((persona) => persona.role)).toContain("modern_defender");

    await page.getByLabel("Council prompt / context").fill(
      "I want a fair but strict debate that protects time without dismissing modern exceptions.",
    );
    await page.getByLabel("Candidate").selectOption(candidateId);
    await page.getByLabel("Media item").selectOption(mediaItemId);

    const runResponse = waitForApiResponse(page, "POST", "/api/council-sessions/", 201);
    await page.getByRole("button", { name: "Run Council" }).click();
    const session = await expectApiJson<CouncilSession>(await runResponse);
    expect(session.candidateId).toBe(candidateId);
    expect(session.mediaItemId).toBe(mediaItemId);
    expect(session.criticOpinions.length).toBeGreaterThan(0);
    expect(session.criticOpinions.map((opinion) => opinion.role)).toContain("ruthless_critic");
    expect(session.finalDecision.explanation).toContain("not a hidden score average");
    await expect(page.getByRole("heading", { name: "Critic opinions" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Decision To Candidate" })).toBeVisible();

    await page.getByRole("button", { name: "Critic Settings" }).click();
    const settingsDialog = page.getByRole("dialog", { name: "Critic settings" });
    await expect(settingsDialog).toBeVisible();
    const wildcardCard = settingsDialog.locator("article").filter({ hasText: "Wildcard" }).first();
    await wildcardCard.getByLabel("Enabled").uncheck();
    const patchResponse = waitForApiResponse(page, "PATCH", /\/api\/critic-personas\/[^/]+\/$/, 200);
    await wildcardCard.getByRole("button", { name: "Save Critic" }).click();
    const updatedPersona = await expectApiJson<CriticPersona>(await patchResponse);
    expect(updatedPersona.role).toBe("wildcard");
    expect(updatedPersona.isEnabled).toBe(false);
    await settingsDialog.getByRole("button", { name: "Close" }).click();

    const rerunResponse = waitForApiResponse(page, "POST", "/api/council-sessions/", 201);
    await page.getByRole("button", { name: "Run Council" }).click();
    const rerunSession = await expectApiJson<CouncilSession>(await rerunResponse);
    expect(rerunSession.criticOpinions.map((opinion) => opinion.role)).not.toContain("wildcard");

    const applyResponse = waitForApiResponse(
      page,
      "POST",
      /\/api\/council-sessions\/[^/]+\/apply-to-candidate\/$/,
      200,
    );
    await page.getByRole("button", { name: "Add Decision To Candidate" }).click();
    const applyPayload = await expectApiJson<CouncilApplyResponse>(await applyResponse);
    expect(applyPayload.candidate?.status).toBe(applyPayload.session.finalDecision.decision);
    await expect(page.getByText(/Candidate marked as/i)).toBeVisible();

    const candidateSessions = waitForApiResponse(page, "GET", "/api/council-sessions/", 200);
    await page.goto("/candidates");
    await page.getByRole("button", { name: new RegExp(candidateTitle) }).click();
    await candidateSessions;
    await expect(page.getByRole("heading", { name: "Critic Council results" })).toBeVisible();
    await expect(page.getByText(/not a hidden score average/i).first()).toBeVisible();
  });
});
