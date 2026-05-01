import { Loader2 } from "lucide-react";

export function LoadingState({ title = "Loading", message }: { title?: string; message?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center" role="status" aria-live="polite">
      <Loader2 aria-hidden="true" className="mx-auto h-6 w-6 animate-spin text-primary" />
      <h2 className="mt-3 text-lg font-semibold">{title}</h2>
      {message ? <p className="mt-2 text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
