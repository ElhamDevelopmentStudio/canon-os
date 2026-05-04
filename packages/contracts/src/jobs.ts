import type { PaginatedResponse } from "./pagination";

export const BACKGROUND_JOB_TYPES = [
  "import",
  "export",
  "metadata_refresh",
  "graph_rebuild",
  "narrative_analysis",
] as const;
export type BackgroundJobType = (typeof BACKGROUND_JOB_TYPES)[number];

export const BACKGROUND_JOB_STATUSES = [
  "queued",
  "processing",
  "complete",
  "failed",
  "rolled_back",
  "cancelled",
] as const;
export type BackgroundJobStatus = (typeof BACKGROUND_JOB_STATUSES)[number];

export type BackgroundJob = {
  id: string;
  jobType: BackgroundJobType;
  status: BackgroundJobStatus;
  progressTotal: number;
  progressProcessed: number;
  progressPercent: number;
  message: string;
  result: Record<string, unknown>;
  sourceId: string | null;
  sourceLabel: string;
  createdAt: string;
  completedAt: string | null;
};

export type BackgroundJobListResponse = PaginatedResponse<BackgroundJob>;
