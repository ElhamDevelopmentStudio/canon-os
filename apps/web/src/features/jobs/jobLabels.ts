import type { BackgroundJobStatus, BackgroundJobType } from "@canonos/contracts";
import type { StatusTone } from "@/components/data-display/StatusPill";

export const backgroundJobTypeLabels: Record<BackgroundJobType, string> = {
  import: "Import",
  export: "Export",
  metadata_refresh: "Metadata refresh",
  graph_rebuild: "Graph rebuild",
  narrative_analysis: "Narrative analysis",
};

export const backgroundJobStatusLabels: Record<BackgroundJobStatus, string> = {
  queued: "Queued",
  processing: "Running",
  complete: "Complete",
  failed: "Failed",
  rolled_back: "Rolled back",
  cancelled: "Cancelled",
};

export const backgroundJobStatusTone: Record<BackgroundJobStatus, StatusTone> = {
  queued: "neutral",
  processing: "active",
  complete: "success",
  failed: "danger",
  rolled_back: "warning",
  cancelled: "neutral",
};

export function isActiveBackgroundJobStatus(status: BackgroundJobStatus): boolean {
  return status === "queued" || status === "processing";
}
