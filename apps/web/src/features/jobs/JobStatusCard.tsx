import type { BackgroundJob } from "@canonos/contracts";

import { SectionCard } from "@/components/layout/SectionCard";
import { JobProgress } from "@/features/jobs/JobProgress";
import { JobResultSummary } from "@/features/jobs/JobResultSummary";
import { JobStatusBadge } from "@/features/jobs/JobStatusBadge";
import { backgroundJobTypeLabels } from "@/features/jobs/jobLabels";

export function JobStatusCard({ job, title = "Background job status" }: { job: BackgroundJob; title?: string }) {
  return (
    <SectionCard title={title}>
      <div className="grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{job.sourceLabel || backgroundJobTypeLabels[job.jobType]}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{job.message || "No status message recorded yet."}</p>
          </div>
          <JobStatusBadge status={job.status} />
        </div>
        <JobProgress job={job} label={`${backgroundJobTypeLabels[job.jobType]} progress`} />
        <JobResultSummary job={job} />
      </div>
    </SectionCard>
  );
}
