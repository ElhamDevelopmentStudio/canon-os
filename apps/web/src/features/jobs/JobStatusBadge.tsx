import type { BackgroundJobStatus } from "@canonos/contracts";

import { StatusPill } from "@/components/data-display/StatusPill";
import { backgroundJobStatusLabels, backgroundJobStatusTone } from "@/features/jobs/jobLabels";

export function JobStatusBadge({ status }: { status: BackgroundJobStatus }) {
  return <StatusPill label={backgroundJobStatusLabels[status]} tone={backgroundJobStatusTone[status]} />;
}
