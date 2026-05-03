import type { BackgroundJob } from "@canonos/contracts";

function formatResultValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

export function JobResultSummary({ job }: { job: BackgroundJob }) {
  const entries = Object.entries(job.result ?? {}).filter(([, value]) => value !== null && value !== undefined && value !== "");
  if (!entries.length) {
    return <p className="text-sm text-muted-foreground">No result details recorded yet.</p>;
  }
  return (
    <dl className="grid gap-2 text-sm sm:grid-cols-2">
      {entries.slice(0, 6).map(([key, value]) => (
        <div className="rounded-xl bg-muted p-3" key={key}>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{key.replace(/([A-Z])/g, " $1")}</dt>
          <dd className="mt-1 break-words font-medium">{formatResultValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}
