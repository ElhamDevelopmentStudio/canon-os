export const IMPORT_SOURCE_TYPES = ["csv", "json"] as const;
export type ImportSourceType = (typeof IMPORT_SOURCE_TYPES)[number];

export const IMPORT_ITEM_STATUSES = ["valid", "invalid", "duplicate", "imported", "skipped"] as const;
export type ImportItemStatus = (typeof IMPORT_ITEM_STATUSES)[number];

export const IMPORT_ITEM_KINDS = ["media", "candidate", "queue", "aftertaste"] as const;
export type ImportItemKind = (typeof IMPORT_ITEM_KINDS)[number];

export type ImportItemPreview = {
  id: string;
  rowNumber: number;
  kind: ImportItemKind;
  status: ImportItemStatus;
  action: string;
  title: string;
  payload: Record<string, unknown>;
  errors: string[];
  warnings: string[];
  createdMediaItemId: string | null;
};

export type ImportBatch = {
  id: string;
  sourceType: ImportSourceType;
  originalFilename: string;
  status: "previewed" | "confirmed" | "rejected";
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  warningsCount: number;
  createdCount: number;
  createdAt: string;
  confirmedAt: string | null;
  items: ImportItemPreview[];
};

export const EXPORT_FORMATS = ["json", "csv"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export type ExportRequest = {
  format: ExportFormat;
};

export type ExportResult = {
  id: string;
  format: ExportFormat;
  status: "complete" | "failed";
  filename: string;
  content_type: string;
  recordCount: number;
  downloadUrl: string;
  createdAt: string;
};
