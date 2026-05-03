import { test, expect } from "./helpers/fixtures";
import { registerViaUi } from "./helpers/auth";
import { uniqueTitle } from "./helpers/data";
import { expectApiJson, waitForApiResponse } from "./helpers/network";
import type { CandidateEvaluateResponse } from "@canonos/contracts";

test.describe("candidate evaluator browser-to-backend flow", () => {
  test("creates, evaluates, updates, adds to library, and adds to queue", async ({ page }) => {
    await registerViaUi(page);
    const title = uniqueTitle("E2E Candidate");
    const updatedTitle = `${title} Revised`;

    const listResponse = waitForApiResponse(page, "GET", "/api/candidates/", 200);
    await page.goto("/candidates");
    await listResponse;

    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Known creator").fill("E2E Creator");
    await page.getByLabel("Source of interest").fill("Friend signal");
    await page.getByLabel("Premise / signal notes").fill("A focused premise with a clear authorial voice.");
    await page.getByLabel("Expected genericness (0-10)").fill("2");

    const createResponse = waitForApiResponse(page, "POST", "/api/candidates/", 201);
    const evaluateResponse = waitForApiResponse(page, "POST", /\/api\/candidates\/[^/]+\/evaluate\/$/, 200);
    await page.getByRole("button", { name: "Run Evaluation" }).click();
    await createResponse;
    const evaluationPayload = await expectApiJson<CandidateEvaluateResponse>(await evaluateResponse);
    expect(evaluationPayload.evaluation.antiGenericEvaluation).not.toBeNull();
    await expect(page.getByText("Evaluation saved with the candidate history.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Anti-Generic Filter" })).toBeVisible();
    await expect(page.getByRole("button", { name: new RegExp(title) })).toBeVisible();

    await page.getByLabel("Title").fill(updatedTitle);
    const updateResponse = waitForApiResponse(page, "PATCH", /\/api\/candidates\/[^/]+\/$/, 200);
    await page.getByRole("button", { name: "Save Candidate" }).click();
    await updateResponse;
    await expect(page.getByText("Candidate saved to evaluator history.")).toBeVisible();
    await expect(page.getByRole("button", { name: new RegExp(updatedTitle) })).toBeVisible();

    const addToLibraryResponse = waitForApiResponse(page, "POST", /\/api\/candidates\/[^/]+\/add-to-library\/$/, 201);
    await page.getByRole("button", { name: "Add To Library" }).click();
    await addToLibraryResponse;
    await expect(page.getByText(`Added “${updatedTitle}” to the library as Planned.`)).toBeVisible();

    const addToQueueResponse = waitForApiResponse(page, "POST", "/api/queue-items/", 201);
    await page.getByRole("button", { name: "Add To Queue" }).click();
    await addToQueueResponse;
    await expect(page.getByText(`Added “${updatedTitle}” to the queue.`)).toBeVisible();
  });
});
