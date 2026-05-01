import type { Page } from "@playwright/test";

import { test, expect } from "./helpers/fixtures";
import { registerViaUi } from "./helpers/auth";
import { uniqueTitle } from "./helpers/data";
import { waitForApiResponse } from "./helpers/network";

async function createScoredMedia(page: Page, title: string) {
  await page.goto("/library");
  await page.getByRole("button", { name: "Add Media" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Add media" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Title", { exact: true }).fill(title);
  await dialog.getByLabel("Status").selectOption({ label: "Completed" });
  await dialog.getByLabel("Media type").selectOption({ label: "Movie" });
  await dialog.getByLabel("Personal rating").fill("9.2");
  await dialog.getByText("Atmosphere").scrollIntoViewIfNeeded();

  const scoreInputs = dialog.getByRole("spinbutton", { name: "Score" });
  await scoreInputs.nth(0).fill("8.0");
  await scoreInputs.nth(1).fill("7.5");
  await scoreInputs.nth(2).fill("9.5");
  await scoreInputs.nth(11).fill("8.0");
  await scoreInputs.nth(12).fill("7.5");

  const createResponse = waitForApiResponse(page, "POST", "/api/media-items/", 201);
  const scoreResponse = waitForApiResponse(page, "PUT", /\/api\/media-items\/[^/]+\/scores\/$/, 200);
  await page.getByRole("button", { name: "Save media" }).click();
  await createResponse;
  await scoreResponse;
  await expect(page.getByRole("link", { name: title })).toBeVisible();
}

async function addAftertaste(page: Page, mediaTitle: string) {
  await page.goto("/aftertaste-log");
  await page.getByRole("button", { name: "New Reflection" }).first().click();
  const dialog = page.getByRole("dialog", { name: "New Reflection" });
  await dialog.getByLabel("Media item").selectOption({ label: mediaTitle });
  await dialog.getByLabel("Stayed with me score").fill("9");
  await dialog.getByLabel("Felt generic").selectOption({ label: "Yes" });
  await dialog.getByLabel("Worth time").selectOption({ label: "No" });
  await dialog.getByLabel("Final thoughts").fill("Great craft, but the genericness warning matters.");
  const createResponse = waitForApiResponse(page, "POST", "/api/aftertaste/", 201);
  await page.getByRole("button", { name: "Save reflection" }).click();
  await createResponse;
}

test.describe("taste profile browser-to-backend flow", () => {
  test("shows empty profile, then updates after scoring and aftertaste", async ({ page }) => {
    await registerViaUi(page);

    const emptyProfileResponse = waitForApiResponse(page, "GET", "/api/taste-profile/", 200);
    await page.goto("/taste-profile");
    await emptyProfileResponse;
    await expect(page.getByRole("heading", { name: "Taste Profile", exact: true })).toBeVisible();
    await expect(page.getByText("Taste Profile needs more evidence")).toBeVisible();

    const title = uniqueTitle("E2E Taste Profile Media");
    await createScoredMedia(page, title);
    await addAftertaste(page, title);

    const profileResponse = waitForApiResponse(page, "GET", "/api/taste-profile/", 200);
    await page.goto("/taste-profile");
    await profileResponse;
    await expect(page.getByText("Current taste read")).toBeVisible();
    await expect(page.getByText("Strongest dimensions")).toBeVisible();
    await expect(page.getByText("Red flags")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Genericness warning" })).toBeVisible();
    await expect(page.getByText(title)).toBeVisible();

    const refreshResponse = waitForApiResponse(page, "GET", "/api/taste-profile/", 200);
    await page.getByRole("button", { name: "Refresh Profile" }).click();
    await refreshResponse;
  });
});
