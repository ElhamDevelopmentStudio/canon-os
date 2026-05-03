import { test, expect } from "./helpers/fixtures";
import type { Page } from "@playwright/test";
import { registerViaUi } from "./helpers/auth";
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
});
