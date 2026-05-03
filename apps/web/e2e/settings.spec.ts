import { test, expect } from "./helpers/fixtures";
import type { Page } from "@playwright/test";
import { registerViaUi } from "./helpers/auth";
import { uniqueTitle } from "./helpers/data";
import { expectApiJson, waitForApiResponse } from "./helpers/network";

async function setRangeValue(page: Page, label: string, value: string) {
  await page.getByLabel(label).evaluate(
    (element, nextValue) => {
      const input = element as HTMLInputElement;
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      valueSetter?.call(input, nextValue);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
    value,
  );
}

async function openAddMedia(page: Page) {
  await page.getByRole("button", { name: "Add Media" }).first().click();
  await expect(page.getByRole("dialog", { name: "Add media" })).toBeVisible();
}

test.describe("settings browser-to-backend flow", () => {
  test("updates settings, persists them, and applies recommendation defaults", async ({ page }) => {
    await registerViaUi(page);

    const initialSettingsResponse = waitForApiResponse(page, "GET", "/api/auth/settings/", 200);
    await page.goto("/settings");
    const initialSettings = await expectApiJson<{
      display: { themePreference: string };
      recommendation: { defaultRiskTolerance: string; genericnessSensitivity: number };
    }>(await initialSettingsResponse);
    expect(initialSettings.display.themePreference).toBe("system");
    expect(initialSettings.recommendation.defaultRiskTolerance).toBe("medium");

    await page.getByLabel("Display name").fill("E2E Settings Reader");
    await page.getByLabel("Timezone").fill("Asia/Kabul");
    await page.getByLabel("Theme preference").selectOption({ label: "Dark" });
    await page.getByLabel("Default risk tolerance").selectOption({ label: "High" });
    await page.getByLabel("Default Tonight minutes").fill("45");
    await page.getByLabel("Default Tonight energy").selectOption({ label: "Low" });
    await page.getByLabel("Default Tonight focus").selectOption({ label: "Deep" });
    await page.getByLabel("Default Tonight desired effect").selectOption({ label: "Light" });
    await setRangeValue(page, "Genericness sensitivity", "9");
    await setRangeValue(page, "Modern media skepticism level", "8");
    await setRangeValue(page, "Recommendation strictness", "7");
    await setRangeValue(page, "Burnout sensitivity", "8");
    await setRangeValue(page, "Completion detox strictness", "9");
    await setRangeValue(page, "Personal fit", "36");
    await setRangeValue(page, "Quality signal", "24");
    await page.getByLabel("Allow modern exceptions").uncheck();
    await page.getByLabel("Browser notifications").check();
    await page.getByLabel("TV Show").check();

    const updateResponsePromise = waitForApiResponse(page, "PATCH", "/api/auth/settings/", 200);
    await page.getByRole("button", { name: "Save Settings" }).click();
    const updateResponse = await updateResponsePromise;
    const savedSettings = await expectApiJson<{
      profile: { displayName: string; timezone: string };
      display: { themePreference: string };
      recommendation: {
        defaultMediaTypes: string[];
        defaultRiskTolerance: string;
        defaultTonightMode: {
          availableMinutes: number;
          energyLevel: string;
          focusLevel: string;
          desiredEffect: string;
        };
        genericnessSensitivity: number;
        modernMediaSkepticismLevel: number;
        preferredRecommendationStrictness: number;
        burnoutSensitivity: number;
        completionDetoxStrictness: number;
        recommendationFormulaWeights: { personalFit: number; qualitySignal: number };
        allowModernExceptions: boolean;
        notificationPreferences: { browserNotifications: boolean };
      };
    }>(updateResponse);

    expect(savedSettings.profile.displayName).toBe("E2E Settings Reader");
    expect(savedSettings.profile.timezone).toBe("Asia/Kabul");
    expect(savedSettings.display.themePreference).toBe("dark");
    expect(savedSettings.recommendation.defaultMediaTypes).toContain("tv_show");
    expect(savedSettings.recommendation.defaultRiskTolerance).toBe("high");
    expect(savedSettings.recommendation.defaultTonightMode.availableMinutes).toBe(45);
    expect(savedSettings.recommendation.defaultTonightMode.energyLevel).toBe("low");
    expect(savedSettings.recommendation.defaultTonightMode.focusLevel).toBe("deep");
    expect(savedSettings.recommendation.defaultTonightMode.desiredEffect).toBe("light");
    expect(savedSettings.recommendation.genericnessSensitivity).toBe(9);
    expect(savedSettings.recommendation.modernMediaSkepticismLevel).toBe(8);
    expect(savedSettings.recommendation.preferredRecommendationStrictness).toBe(7);
    expect(savedSettings.recommendation.burnoutSensitivity).toBe(8);
    expect(savedSettings.recommendation.completionDetoxStrictness).toBe(9);
    expect(savedSettings.recommendation.recommendationFormulaWeights.personalFit).toBe(36);
    expect(savedSettings.recommendation.recommendationFormulaWeights.qualitySignal).toBe(24);
    expect(savedSettings.recommendation.allowModernExceptions).toBe(false);
    expect(savedSettings.recommendation.notificationPreferences.browserNotifications).toBe(true);
    await expect(page.getByText("Settings saved.")).toBeVisible();
    await expect(page.locator("html")).toHaveClass(/dark/);

    const reloadedSettingsResponse = waitForApiResponse(page, "GET", "/api/auth/settings/", 200);
    await page.reload();
    await reloadedSettingsResponse;
    await expect(page.getByLabel("Display name")).toHaveValue("E2E Settings Reader");
    await expect(page.getByLabel("Default risk tolerance")).toHaveValue("high");
    await expect(page.getByLabel("Default Tonight minutes")).toHaveValue("45");
    await expect(page.getByLabel("Genericness sensitivity")).toHaveValue("9");

    await page.goto("/tonight");
    await expect(page.getByLabel("Available time (minutes)")).toHaveValue("45");
    await expect(page.getByLabel("Energy level")).toHaveValue("low");
    await expect(page.getByLabel("Focus level")).toHaveValue("deep");
    await expect(page.getByLabel("Desired effect")).toHaveValue("light");
    await expect(page.getByLabel("Risk tolerance")).toHaveValue("high");
    await expect(page.getByLabel("TV Show")).toBeChecked();

    await page.goto("/candidates");
    await expect(page.getByText("saved genericness sensitivity: 9/10")).toBeVisible();
    await expect(page.getByText("modern media skepticism: 8/10")).toBeVisible();
    await expect(page.getByText("recommendation strictness: 7/10")).toBeVisible();
    await expect(page.getByText("modern exceptions: disabled")).toBeVisible();
  });

  test("exports private data and deletes data/account with strong confirmation", async ({ page }) => {
    await registerViaUi(page);
    const title = uniqueTitle("Privacy Media");

    const initialListResponse = waitForApiResponse(page, "GET", "/api/media-items/", 200);
    await page.goto("/library");
    await initialListResponse;
    await openAddMedia(page);
    await page.getByLabel("Title", { exact: true }).fill(title);
    await page.getByLabel("Notes").fill("Private note that must be exportable and deletable.");
    const createMediaResponse = waitForApiResponse(page, "POST", "/api/media-items/", 201);
    await page.getByRole("button", { name: "Save media" }).click();
    await createMediaResponse;
    await expect(page.getByRole("link", { name: title })).toBeVisible();

    const privacySummaryResponse = waitForApiResponse(page, "GET", "/api/auth/data/", 200);
    await page.goto("/settings");
    const privacySummary = await expectApiJson<{ counts: { mediaItems: number }; totalRecords: number }>(
      await privacySummaryResponse,
    );
    expect(privacySummary.counts.mediaItems).toBeGreaterThanOrEqual(1);
    expect(privacySummary.totalRecords).toBeGreaterThan(0);
    await expect(page.getByRole("heading", { name: "Privacy and security" })).toBeVisible();
    await expect(page.getByText("private media history, ratings, taste scores")).toBeVisible();
    await expect(page.getByText("External metadata snapshots store provider IDs")).toBeVisible();

    const exportResponsePromise = waitForApiResponse(page, "POST", "/api/exports/", 201);
    await page.getByRole("button", { name: "Export My Data" }).click();
    const exportPayload = await expectApiJson<{ recordCount: number; filename: string }>(
      await exportResponsePromise,
    );
    expect(exportPayload.recordCount).toBeGreaterThanOrEqual(1);
    await expect(page.getByText("Privacy export ready")).toBeVisible();
    await expect(page.getByText(`Latest privacy export: ${exportPayload.filename}`)).toBeVisible();

    await page.getByRole("button", { name: "Delete All CanonOS Data" }).click();
    const dataDialog = page.getByRole("dialog", { name: "Delete all CanonOS data?" });
    await expect(dataDialog).toBeVisible();
    await expect(dataDialog.getByRole("button", { name: "Delete All CanonOS Data" })).toBeDisabled();
    await dataDialog.getByLabel("Type DELETE MY DATA to confirm").fill("DELETE MY DATA");
    const dataDeleteResponsePromise = waitForApiResponse(
      page,
      "DELETE",
      "/api/auth/data/delete/",
      200,
    );
    await dataDialog.getByRole("button", { name: "Delete All CanonOS Data" }).click();
    const dataDeletePayload = await expectApiJson<{
      deletedCounts: { mediaItems: number };
      totalDeleted: number;
    }>(await dataDeleteResponsePromise);
    expect(dataDeletePayload.deletedCounts.mediaItems).toBeGreaterThanOrEqual(1);
    expect(dataDeletePayload.totalDeleted).toBeGreaterThan(0);
    await expect(page.getByText("CanonOS data deleted")).toBeVisible();

    const emptyListResponse = waitForApiResponse(page, "GET", "/api/media-items/", 200);
    await page.goto("/library");
    const emptyListPayload = await expectApiJson<{ count: number }>(await emptyListResponse);
    expect(emptyListPayload.count).toBe(0);
    await expect(page.getByText("No media items match this view")).toBeVisible();

    const refreshedSummaryResponse = waitForApiResponse(page, "GET", "/api/auth/data/", 200);
    await page.goto("/settings");
    const refreshedSummary = await expectApiJson<{ counts: { mediaItems: number } }>(
      await refreshedSummaryResponse,
    );
    expect(refreshedSummary.counts.mediaItems).toBe(0);
    await page.getByRole("button", { name: "Delete Account" }).click();
    const accountDialog = page.getByRole("dialog", { name: "Delete your account?" });
    await expect(accountDialog).toBeVisible();
    await expect(accountDialog.getByRole("button", { name: "Delete Account" })).toBeDisabled();
    await accountDialog.getByLabel("Type DELETE MY ACCOUNT to confirm").fill("DELETE MY ACCOUNT");
    const accountDeleteResponsePromise = waitForApiResponse(
      page,
      "DELETE",
      "/api/auth/account/",
      200,
    );
    await accountDialog.getByRole("button", { name: "Delete Account" }).click();
    const accountPayload = await expectApiJson<{ deleted: boolean }>(await accountDeleteResponsePromise);
    expect(accountPayload.deleted).toBe(true);
    await expect(page).toHaveURL("/register");
  });
});
