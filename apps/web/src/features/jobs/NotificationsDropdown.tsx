import { Bell, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

import { APP_ROUTES } from "@/app/routeConstants";
import { Button } from "@/components/ui/button";
import { JobStatusBadge } from "@/features/jobs/JobStatusBadge";
import { backgroundJobTypeLabels } from "@/features/jobs/jobLabels";
import { useBackgroundJobs } from "@/features/jobs/jobsApi";

export function NotificationsDropdown() {
  const { data, error, isLoading } = useBackgroundJobs();
  const jobs = data?.results ?? [];
  const recentJobs = jobs.slice(0, 5);
  const activeCount = jobs.filter((job) => job.status === "queued" || job.status === "processing").length;

  return (
    <details className="relative">
      <summary className="list-none">
        <Button aria-label="Open job notifications" className="gap-2" size="sm" type="button" variant="secondary" asChild>
          <span>
            <Bell aria-hidden="true" className="h-4 w-4" />
            <span className="hidden sm:inline">Jobs</span>
            {activeCount > 0 ? (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">{activeCount}</span>
            ) : null}
          </span>
        </Button>
      </summary>
      <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-border bg-card p-3 text-card-foreground shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Recent job notifications</h2>
          <Link className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline" to={APP_ROUTES.jobs}>
            View all <ExternalLink aria-hidden="true" className="h-3 w-3" />
          </Link>
        </div>
        <div className="mt-3 grid gap-2">
          {isLoading ? <p className="text-sm text-muted-foreground">Loading jobs…</p> : null}
          {error ? <p className="text-sm text-destructive">Could not load job notifications.</p> : null}
          {!isLoading && !error && recentJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No background jobs yet.</p>
          ) : null}
          {recentJobs.map((job) => (
            <article className="rounded-xl bg-muted p-3 text-sm" key={job.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{job.sourceLabel || backgroundJobTypeLabels[job.jobType]}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{job.message || backgroundJobTypeLabels[job.jobType]}</p>
                </div>
                <JobStatusBadge status={job.status} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </details>
  );
}
