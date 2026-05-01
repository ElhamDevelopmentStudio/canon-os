import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { PageSubtitle, PageTitle } from "@/components/layout/PageText";
import { MetricCard } from "@/components/data-display/MetricCard";
import { SectionCard } from "@/components/layout/SectionCard";
import { StatusPill } from "@/components/data-display/StatusPill";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api";
import { useHealthCheck } from "@/lib/health";

export function DashboardPage() {
  const { data, error, isLoading, mutate } = useHealthCheck();

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">Dashboard</p>
        <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_18rem] lg:items-end">
          <div>
            <PageTitle>Choose better media with inspectable judgment.</PageTitle>
            <PageSubtitle>
              CanonOS is a private workbench for library tracking, candidate evaluation, tonight-mode decisions,
              aftertaste reflection, and taste evolution.
            </PageSubtitle>
          </div>
          <SectionCard title="API status" className="bg-background p-4">
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
              {error ? error.message : `Health check reads from ${API_BASE_URL}.`}
            </p>
            <Button className="mt-4 w-full" type="button" onClick={() => void mutate()}>
              Recheck health
            </Button>
          </SectionCard>
        </div>
      </section>

      <section aria-labelledby="system-metrics" className="grid gap-4 md:grid-cols-3">
        <h2 className="sr-only" id="system-metrics">System readiness</h2>
        <MetricCard label="Library readiness" value={<StatusPill label="Next" tone="active" />} helper="Media models begin in MVP-M04." />
        <MetricCard label="Candidate evaluator" value="Queued" helper="Evaluation surfaces begin after the library contract exists." />
        <MetricCard label="Tonight Mode" value="Planned" helper="Decision flow will use mood, time, and energy inputs." />
      </section>
    </div>
  );
}
