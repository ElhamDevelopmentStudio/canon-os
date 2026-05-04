import type { Page } from "@playwright/test";

import { test, expect } from "./helpers/fixtures";
import { registerViaUi } from "./helpers/auth";
import { uniqueTitle } from "./helpers/data";
import { waitForApiResponse } from "./helpers/network";

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => ({
    bodyScrollWidth: document.body.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
  }));
  expect(
    Math.max(overflow.bodyScrollWidth, overflow.documentScrollWidth),
    `${label} should not create page-level horizontal scrolling`,
  ).toBeLessThanOrEqual(overflow.clientWidth + 2);
}

async function expectVisibleControlsAreNamed(page: Page, label: string) {
  const issues = await page.evaluate(() => {
    function isVisible(element: Element): boolean {
      const htmlElement = element as HTMLElement;
      const style = window.getComputedStyle(htmlElement);
      return (
        !htmlElement.hidden &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        htmlElement.getClientRects().length > 0
      );
    }

    function labelledByText(element: Element): string {
      const labelledBy = element.getAttribute("aria-labelledby");
      if (!labelledBy) return "";
      return labelledBy
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
        .join(" ")
        .trim();
    }

    const unnamedButtons = Array.from(document.querySelectorAll("button"))
      .filter(isVisible)
      .filter((button) => {
        const text = button.textContent?.trim() ?? "";
        return !button.getAttribute("aria-label") && !button.getAttribute("title") && !labelledByText(button) && !text;
      })
      .map((button) => button.outerHTML.slice(0, 180));

    const unlabelledFields = Array.from(document.querySelectorAll("input:not([type='hidden']), select, textarea"))
      .filter(isVisible)
      .filter((field) => {
        const input = field as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        return !input.getAttribute("aria-label") && !labelledByText(input) && input.labels.length === 0;
      })
      .map((field) => field.outerHTML.slice(0, 180));

    return { unnamedButtons, unlabelledFields };
  });

  expect.soft(issues.unnamedButtons, `${label} visible buttons need accessible names`).toEqual([]);
  expect.soft(issues.unlabelledFields, `${label} visible fields need labels`).toEqual([]);
}

async function openMobileNavigation(page: Page) {
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
}

test.describe("accessibility and responsive UI polish", () => {
  test("keeps app shell navigation usable on mobile and prevents page-level horizontal overflow", async ({ page }) => {
    await registerViaUi(page);

    await page.goto("/library");
    const mediaTitle = uniqueTitle("Accessible Detail Media");
    await page.getByRole("button", { name: "Add Media" }).first().click();
    await expect(page.getByRole("dialog", { name: "Add media" })).toBeVisible();
    await page.getByLabel("Title", { exact: true }).fill(mediaTitle);
    const createResponse = waitForApiResponse(page, "POST", "/api/media-items/", 201);
    await page.getByRole("button", { name: "Save media" }).click();
    await createResponse;

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /private media command center/i })).toBeVisible();
    await expectNoHorizontalOverflow(page, "Dashboard mobile");

    const mobileRoutes = [
      { link: "Library", heading: "Library" },
      { link: "Candidates", heading: "Candidate Evaluator" },
      { link: "Tonight Mode", heading: "Tonight Mode" },
      { link: "Queue", heading: "Adaptive Queue" },
    ];

    for (const route of mobileRoutes) {
      await openMobileNavigation(page);
      await page.getByRole("link", { name: route.link }).click();
      await expect(page.getByRole("button", { name: "Open navigation" })).toHaveAttribute("aria-expanded", "false");
      await expect(page.getByRole("heading", { exact: true, name: route.heading })).toBeVisible();
      await expectNoHorizontalOverflow(page, `${route.heading} mobile`);
    }

    await page.goto("/library");
    await page.getByRole("link", { name: mediaTitle }).click();
    await expect(page.getByRole("heading", { name: mediaTitle })).toBeVisible();
    await expectNoHorizontalOverflow(page, "Media Detail mobile");
  });

  test("exposes accessible names for visible buttons and labels for visible form controls", async ({ page }) => {
    await registerViaUi(page);

    for (const route of ["/", "/library", "/candidates", "/tonight", "/queue", "/settings"]) {
      await page.goto(route);
      await expect(page.locator("main h1")).toBeVisible();
      await expectVisibleControlsAreNamed(page, route);
    }
  });

  test("supports keyboard command palette and media dialog focus", async ({ page }) => {
    await registerViaUi(page);

    await page.keyboard.press("Control+K");
    await expect(page.getByRole("dialog", { name: "Command palette" })).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "Global search" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Command palette" })).toHaveCount(0);

    await page.goto("/library");
    await page.getByRole("button", { name: "Add Media" }).first().click();
    await expect(page.getByRole("dialog", { name: "Add media" })).toBeVisible();
    await expect(page.getByLabel("Title", { exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Add media" })).toHaveCount(0);
  });
});
