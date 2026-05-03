export const IMPORT_SOURCE_TYPES = ["csv", "json"] as const;
export type ImportSourceType = (typeof IMPORT_SOURCE_TYPES)[number];

export const IMPORT_ITEM_STATUSES = ["valid", "invalid", "duplicate", "imported", "skipped", "rolled_back"] as const;
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
  duplicateOfMediaItemId: string | null;
  createdObjectId: string | null;
};

export type ImportBatchStatus = "previewed" | "processing" | "confirmed" | "rejected" | "rolled_back" | "failed";

export type ImportBatch = {
  id: string;
  sourceType: ImportSourceType;
  originalFilename: string;
  uploadedFileReference: string;
  fileSizeBytes: number;
  status: ImportBatchStatus;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  warningsCount: number;
  createdCount: number;
  progressTotal: number;
  progressProcessed: number;
  progressPercent: number;
  errorMessage: string;
  rollbackItemCount: number;
  rollbackErrorMessage: string;
  createdAt: string;
  confirmedAt: string | null;
  processedAt: string | null;
  rolledBackAt: string | null;
  items: ImportItemPreview[];
};

export type ImportRollbackResult = {
  batch: ImportBatch;
  removedCount: number;
  mediaItemsRemoved: number;
  candidatesRemoved: number;
  queueItemsRemoved: number;
};

export const EXPORT_FORMATS = ["json", "csv"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export type ExportRequest = {
  format: ExportFormat;
};

export type ExportStatus = "queued" | "processing" | "complete" | "failed";

export type ExportResult = {
  id: string;
  format: ExportFormat;
  status: ExportStatus;
  filename: string;
  content_type: string;
  recordCount: number;
  progressTotal: number;
  progressProcessed: number;
  progressPercent: number;
  fileSizeBytes: number;
  retentionExpiresAt: string | null;
  restoreValidation: Record<string, unknown>;
  errorMessage: string;
  downloadUrl: string;
  createdAt: string;
  processedAt: string | null;
};

export type ExportRestoreDryRunResult = {
  version: string;
  isValid: boolean;
  totalCount: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  warningsCount: number;
  countsByKind: Record<ImportItemKind, number>;
  errors: string[];
  warnings: string[];
};
