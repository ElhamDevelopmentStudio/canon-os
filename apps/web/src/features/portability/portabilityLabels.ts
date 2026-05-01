import type { ExportFormat, ImportItemStatus, ImportSourceType } from "@canonos/contracts";

export const importSourceTypeLabels: Record<ImportSourceType, string> = {
  csv: "CSV media list",
  json: "CanonOS JSON export",
};

export const exportFormatLabels: Record<ExportFormat, string> = {
  json: "Full JSON backup",
  csv: "Media and ratings CSV",
};

export const importStatusLabels: Record<ImportItemStatus, string> = {
  valid: "Valid",
  invalid: "Invalid",
  duplicate: "Duplicate",
  imported: "Imported",
  skipped: "Skipped",
};
