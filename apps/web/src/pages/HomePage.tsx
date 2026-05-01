import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useHealthCheck } from "@/lib/health";

export function HomePage() {
  const { data, error, isLoading, mutate } = useHealthCheck();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">Foundation</p>
        <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_18rem] lg:items-end">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">
              Choose better media with inspectable judgment.
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
              CanonOS is being built as a private workbench for library tracking, candidate
              evaluation, tonight-mode decisions, aftertaste reflection, and taste evolution.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm font-medium text-muted-foreground">API status</p>
            <div className="mt-3 flex items-center gap-2" role="status" aria-live="polite">
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
              {data ? <CheckCircle2 className="h-5 w-5 text-promising" aria-hidden="true" /> : null}
              {error ? <AlertCircle className="h-5 w-5 text-risky" aria-hidden="true" /> : null}
              <span className="font-medium">
                {isLoading && "Checking backend..."}
                {data && `${data.service} is ${data.status}`}
                {error && "Backend not reachable yet"}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {error ? error.message : "Health check reads from VITE_API_BASE_URL."}
            </p>
            <Button className="mt-4 w-full" type="button" onClick={() => void mutate()}>
              Recheck health
            </Button>
          </div>
        </div>
      </section>

      <section aria-labelledby="next-modules" className="grid gap-4 md:grid-cols-3">
        <ModuleCard title="Library" body="Track consumed, planned, dropped, and paused works." />
        <ModuleCard title="Evaluate" body="Score candidates before committing attention." />
        <ModuleCard title="Tonight Mode" body="Pick a small set of options for current energy and time." />
      </section>
    </div>
  );
}

function ModuleCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-2xl border border-border bg-card p-5">
      <h3 id={title === "Library" ? "next-modules" : undefined} className="text-lg font-semibold">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
    </article>
  );
}
