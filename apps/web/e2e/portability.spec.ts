import { test, expect } from "./helpers/fixtures";
import { registerViaUi } from "./helpers/auth";
import { uniqueTitle } from "./helpers/data";
import { expectApiJson, waitForApiResponse } from "./helpers/network";

test.describe("import and export browser-to-backend flow", () => {
  test("previews and confirms CSV import, then exports JSON and CSV backups", async ({ page }) => {
    await registerViaUi(page);
    const importedTitle = uniqueTitle("E2E Imported Media");
    const csv = [
      "title,media_type,status,personal_rating,release_year,creator,notes,score_atmosphere",
      `${importedTitle},movie,completed,9.1,2002,E2E Importer,Imported through browser e2e,8.5`,
    ].join("\n");

    await page.goto("/settings");
    await page.getByLabel("Import source type").selectOption({ label: "CSV media list" });
    await page.getByLabel("Import file").setInputFiles({
      name: "canonos-import.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv),
    });

    const previewResponsePromise = waitForApiResponse(page, "POST", "/api/imports/preview/", 201);
    await page.getByRole("button", { name: "Preview Import" }).click();
    const preview = await expectApiJson<{ id: string; validCount: number; invalidCount: number; items: { title: string }[] }>(
      await previewResponsePromise,
    );
    expect(preview.validCount).toBe(1);
    expect(preview.invalidCount).toBe(0);
    expect(preview.items[0].title).toBe(importedTitle);
    await expect(page.getByText("Valid: 1")).toBeVisible();
    await expect(page.getByText(importedTitle)).toBeVisible();

    const confirmResponsePromise = waitForApiResponse(page, "POST", `/api/imports/${preview.id}/confirm/`, 200);
    await page.getByRole("button", { name: "Confirm Import" }).click();
    const confirmed = await expectApiJson<{ status: string; createdCount: number }>(await confirmResponsePromise);
    expect(confirmed.status).toBe("confirmed");
    expect(confirmed.createdCount).toBe(1);
    await expect(page.getByText("Import complete. Created 1 records.")).toBeVisible();

    const libraryResponse = waitForApiResponse(page, "GET", "/api/media-items/", 200);
    await page.goto("/library");
    await libraryResponse;
    await expect(page.getByRole("link", { name: importedTitle })).toBeVisible();

    const dashboardResponsePromise = waitForApiResponse(page, "GET", "/api/dashboard/summary/", 200);
    await page.goto("/");
    const dashboardSummary = await expectApiJson<{ counts: { totalMedia: number } }>(await dashboardResponsePromise);
    expect(dashboardSummary.counts.totalMedia).toBeGreaterThanOrEqual(1);
    await expect(page.getByText("Total library")).toBeVisible();

    await page.goto("/settings");
    await page.getByLabel("Export format").selectOption({ label: "Full JSON backup" });
    const jsonExportResponse = waitForApiResponse(page, "POST", "/api/exports/", 201);
    await page.getByRole("button", { name: "Request Export" }).click();
    const jsonExport = await expectApiJson<{ id: string; format: string; recordCount: number }>(await jsonExportResponse);
    expect(jsonExport.format).toBe("json");
    expect(jsonExport.recordCount).toBeGreaterThanOrEqual(1);

    const jsonDownloadResponse = waitForApiResponse(page, "GET", `/api/exports/${jsonExport.id}/download/`, 200);
    await page.getByRole("button", { name: "Download Export" }).click();
    const jsonDownload = await jsonDownloadResponse;
    expect(await jsonDownload.text()).toContain(importedTitle);
    await expect(page.getByText(/Downloaded canonos-export/)).toBeVisible();

    await page.getByLabel("Export format").selectOption({ label: "Media and ratings CSV" });
    const csvExportResponse = waitForApiResponse(page, "POST", "/api/exports/", 201);
    await page.getByRole("button", { name: "Request Export" }).click();
    const csvExport = await expectApiJson<{ id: string; format: string }>(await csvExportResponse);
    expect(csvExport.format).toBe("csv");
    const csvDownloadResponse = waitForApiResponse(page, "GET", `/api/exports/${csvExport.id}/download/`, 200);
    await page.getByRole("button", { name: "Download Export" }).click();
    const csvDownload = await csvDownloadResponse;
    expect(await csvDownload.text()).toContain("score_atmosphere");
    await expect(page.getByText(/Downloaded canonos-media-export/)).toBeVisible();
  });

  test("shows invalid CSV rows without changing the visible library", async ({ page }) => {
    await registerViaUi(page);
    await page.goto("/settings");
    await page.getByLabel("Import file").setInputFiles({
      name: "invalid-import.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("title,media_type,status\n,unknown,completed\n"),
    });

    const previewResponsePromise = waitForApiResponse(page, "POST", "/api/imports/preview/", 201);
    await page.getByRole("button", { name: "Preview Import" }).click();
    const preview = await expectApiJson<{ invalidCount: number }>(await previewResponsePromise);
    expect(preview.invalidCount).toBe(1);
    await expect(page.getByText("Invalid: 1")).toBeVisible();
    await expect(page.getByText("title is required.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirm Import" })).toBeDisabled();

    const libraryResponse = waitForApiResponse(page, "GET", "/api/media-items/", 200);
    await page.goto("/library");
    await libraryResponse;
    await expect(page.getByText("No media items match this view")).toBeVisible();
  });
});
