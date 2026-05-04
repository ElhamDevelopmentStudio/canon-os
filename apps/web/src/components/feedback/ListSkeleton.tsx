export function ListSkeleton({
  label = "Loading list",
  rows = 5,
}: {
  label?: string;
  rows?: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4" role="status" aria-label={label} aria-live="polite">
      <div className="h-4 w-40 animate-pulse rounded-full bg-muted" />
      <div className="mt-4 grid gap-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div className="grid gap-2 rounded-xl border border-border/70 p-3" key={index}>
            <div className="h-4 w-3/4 animate-pulse rounded-full bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded-full bg-muted/80" />
          </div>
        ))}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
