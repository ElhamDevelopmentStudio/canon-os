import type { BackgroundJob } from "@canonos/contracts";

export function JobProgress({ job, label = "Job progress" }: { job: BackgroundJob; label?: string }) {
  const total = job.progressTotal || job.progressProcessed;
  return (
    <div className="grid gap-1.5 text-sm" role="status" aria-label={label}>
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{job.progressProcessed}/{total || 0} • {job.progressPercent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-border">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, job.progressPercent))}%` }} />
      </div>
    </div>
  );
}
