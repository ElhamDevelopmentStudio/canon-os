import type { ExportFormat, ExportStatus, ImportBatchStatus, ImportItemStatus, ImportSourceType } from "@canonos/contracts";

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
  rolled_back: "Rolled back",
};

export const importBatchStatusLabels: Record<ImportBatchStatus, string> = {
  previewed: "Previewed",
  processing: "Processing",
  confirmed: "Confirmed",
  rejected: "Rejected",
  rolled_back: "Rolled back",
  failed: "Failed",
};

export const exportStatusLabels: Record<ExportStatus, string> = {
  queued: "Queued",
  processing: "Processing",
  complete: "Complete",
  failed: "Failed",
};
