import { test, expect } from "./helpers/fixtures";
import { registerViaUi } from "./helpers/auth";
import { expectApiJson, waitForApiResponse } from "./helpers/network";

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
    await page.getByLabel("Genericness sensitivity").fill("9");
    await page.getByLabel("Modern media skepticism level").fill("8");
    await page.getByLabel("Preferred scoring strictness").fill("7");
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
        genericnessSensitivity: number;
        modernMediaSkepticismLevel: number;
        preferredScoringStrictness: number;
      };
    }>(updateResponse);

    expect(savedSettings.profile.displayName).toBe("E2E Settings Reader");
    expect(savedSettings.profile.timezone).toBe("Asia/Kabul");
    expect(savedSettings.display.themePreference).toBe("dark");
    expect(savedSettings.recommendation.defaultMediaTypes).toContain("tv_show");
    expect(savedSettings.recommendation.defaultRiskTolerance).toBe("high");
    expect(savedSettings.recommendation.genericnessSensitivity).toBe(9);
    expect(savedSettings.recommendation.modernMediaSkepticismLevel).toBe(8);
    expect(savedSettings.recommendation.preferredScoringStrictness).toBe(7);
    await expect(page.getByText("Settings saved.")).toBeVisible();
    await expect(page.locator("html")).toHaveClass(/dark/);

    const reloadedSettingsResponse = waitForApiResponse(page, "GET", "/api/auth/settings/", 200);
    await page.reload();
    await reloadedSettingsResponse;
    await expect(page.getByLabel("Display name")).toHaveValue("E2E Settings Reader");
    await expect(page.getByLabel("Default risk tolerance")).toHaveValue("high");
    await expect(page.getByLabel("Genericness sensitivity")).toHaveValue("9");

    await page.goto("/tonight");
    await expect(page.getByLabel("Risk tolerance")).toHaveValue("high");
    await expect(page.getByLabel("TV Show")).toBeChecked();

    await page.goto("/candidates");
    await expect(page.getByText("saved genericness sensitivity: 9/10")).toBeVisible();
    await expect(page.getByText("modern media skepticism: 8/10")).toBeVisible();
  });
});
