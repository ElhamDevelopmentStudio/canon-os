import type { BackgroundJob } from "@canonos/contracts";
import { Activity, RefreshCw } from "lucide-react";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { PageActionBar } from "@/components/layout/PageActionBar";
import { PageSubtitle, PageTitle } from "@/components/layout/PageText";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { JobProgress } from "@/features/jobs/JobProgress";
import { JobResultSummary } from "@/features/jobs/JobResultSummary";
import { JobStatusBadge } from "@/features/jobs/JobStatusBadge";
import { backgroundJobTypeLabels } from "@/features/jobs/jobLabels";
import { useBackgroundJobs } from "@/features/jobs/jobsApi";

export function JobsPage() {
  const { data: jobs = [], error, isLoading, isValidating, mutate } = useBackgroundJobs();

  return (
    <div className="flex flex-col gap-6">
      <section>
        <PageActionBar className="justify-between">
          <div>
            <PageTitle>Background jobs</PageTitle>
            <PageSubtitle>
              Visible status for imports, exports, metadata refreshes, TasteGraph rebuilds, and Narrative DNA analysis.
            </PageSubtitle>
          </div>
          <Button className="gap-2" disabled={isValidating} type="button" variant="secondary" onClick={() => void mutate()}>
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            {isValidating ? "Refreshing…" : "Refresh jobs"}
          </Button>
        </PageActionBar>
      </section>

      {isLoading ? <LoadingState title="Loading background jobs" message="Checking recent async work." /> : null}
      {error ? <ErrorState title="Background jobs unavailable" message={error.message} onRetry={() => void mutate()} /> : null}
      {!isLoading && !error && jobs.length === 0 ? (
        <EmptyState
          title="No background jobs yet"
          message="Run an import, export, metadata refresh, TasteGraph rebuild, or Narrative DNA analysis to see progress here."
        />
      ) : null}
      {!isLoading && !error && jobs.length > 0 ? <JobsTable jobs={jobs} /> : null}
    </div>
  );
}

function JobsTable({ jobs }: { jobs: BackgroundJob[] }) {
  return (
    <SectionCard title="Recent jobs">
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-primary/10 p-2 text-primary">
          <Activity aria-hidden="true" className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">Recent jobs</h2>
          <p className="text-sm text-muted-foreground">Newest owner-scoped jobs are shown first.</p>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Job</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Progress</th>
              <th className="px-4 py-3">Result</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr className="border-t border-border align-top" key={job.id}>
                <td className="px-4 py-3">
                  <p className="font-medium">{job.sourceLabel || backgroundJobTypeLabels[job.jobType]}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{backgroundJobTypeLabels[job.jobType]}</p>
                  <p className="mt-2 max-w-xs text-sm text-muted-foreground">{job.message || "No status message recorded yet."}</p>
                </td>
                <td className="px-4 py-3"><JobStatusBadge status={job.status} /></td>
                <td className="min-w-48 px-4 py-3"><JobProgress job={job} label={`${backgroundJobTypeLabels[job.jobType]} progress`} /></td>
                <td className="min-w-64 px-4 py-3"><JobResultSummary job={job} /></td>
                <td className="px-4 py-3 text-muted-foreground">
                  <time dateTime={job.completedAt ?? job.createdAt}>{new Date(job.completedAt ?? job.createdAt).toLocaleString()}</time>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
