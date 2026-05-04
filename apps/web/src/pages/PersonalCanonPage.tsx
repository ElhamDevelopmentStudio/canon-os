import type { CanonSeason, CanonSeasonCreateRequest, CanonThemeKey } from "@canonos/contracts";
import { BookMarked, Calendar, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { APP_ROUTES } from "@/app/routeConstants";
import { StatusPill } from "@/components/data-display/StatusPill";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { DialogShell } from "@/components/feedback/DialogShell";
import { LoadingState } from "@/components/feedback/LoadingState";
import { PageActionBar } from "@/components/layout/PageActionBar";
import { PageSubtitle, PageTitle } from "@/components/layout/PageText";
import { Button } from "@/components/ui/button";
import { createCanonSeason, useCanonSeasons } from "@/features/canon/canonApi";
import {
  canonSeasonStatusLabels,
  canonSeasonStatusTone,
  canonThemeLabels,
  canonThemes,
} from "@/features/canon/canonLabels";

const emptySeasonDraft: CanonSeasonCreateRequest = {
  title: "",
  theme: "custom",
  description: "",
  status: "planned",
  startDate: null,
  endDate: null,
};

export function PersonalCanonPage() {
  const { data, error, isLoading, mutate } = useCanonSeasons();
  const seasons = data?.results ?? [];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  async function handleCreateSeason(draft: CanonSeasonCreateRequest) {
    setActionError(null);
    setActionMessage(null);
    try {
      const season = await createCanonSeason(draft);
      await mutate();
      setIsModalOpen(false);
      setActionMessage(`${season.title} created as a Personal Canon season.`);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Could not create canon season.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <PageActionBar className="justify-between">
          <div>
            <PageTitle>Personal Canon</PageTitle>
            <PageSubtitle>
              Build themed exploration seasons with ordered works, reasons, attention notes, and reflection prompts.
            </PageSubtitle>
          </div>
          <Button className="gap-2" type="button" onClick={() => setIsModalOpen(true)}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            Create Season
          </Button>
        </PageActionBar>
      </section>

      {isLoading ? <LoadingState title="Loading Personal Canon" message="Fetching your seasons and progress." /> : null}
      {error ? <ErrorState title="Personal Canon unavailable" message={error.message} onRetry={() => void mutate()} /> : null}
      {actionError ? <ErrorState title="Canon action failed" message={actionError} /> : null}
      {actionMessage ? <SuccessMessage message={actionMessage} /> : null}

      {!isLoading && !error && seasons.length === 0 ? (
        <EmptyState
          title="No canon seasons yet"
          message="Create a focused season such as moral collapse, forgotten masterpieces, or atmosphere over plot."
          actionLabel="Create Season"
          onAction={() => setIsModalOpen(true)}
        />
      ) : null}

      {!isLoading && !error && seasons.length > 0 ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {seasons.map((season) => <SeasonCard key={season.id} season={season} />)}
        </section>
      ) : null}

      {isModalOpen ? (
        <SeasonFormDialog
          onCancel={() => setIsModalOpen(false)}
          onSubmit={(draft) => void handleCreateSeason(draft)}
        />
      ) : null}
    </div>
  );
}

function SeasonCard({ season }: { season: CanonSeason }) {
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <BookMarked aria-hidden="true" className="h-4 w-4" />
            {canonThemeLabels[season.theme]}
          </div>
          <h2 className="mt-2 text-xl font-semibold">
            <Link className="hover:text-primary" to={`${APP_ROUTES.seasons}/${season.id}`}>
              {season.title}
            </Link>
          </h2>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
            {season.description || "No description yet. Define the question this season should answer."}
          </p>
        </div>
        <StatusPill label={canonSeasonStatusLabels[season.status]} tone={canonSeasonStatusTone[season.status]} />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <ProgressMetric label="Progress" value={`${season.progressPercent}%`} />
        <ProgressMetric label="Items" value={`${season.completedItemCount}/${season.itemCount}`} />
        <ProgressMetric label="Status" value={canonSeasonStatusLabels[season.status]} />
      </div>
      <div className="mt-4 h-2 rounded-full bg-muted" aria-label={`${season.title} progress`}>
        <div className="h-2 rounded-full bg-primary" style={{ width: `${season.progressPercent}%` }} />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Calendar aria-hidden="true" className="h-3.5 w-3.5" />
          {season.startDate ? `Starts ${season.startDate}` : "No start date"}
        </span>
        <Button asChild size="sm" variant="secondary">
          <Link to={`${APP_ROUTES.seasons}/${season.id}`}>Open Season</Link>
        </Button>
      </div>
    </article>
  );
}

function ProgressMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function SeasonFormDialog({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (draft: CanonSeasonCreateRequest) => void;
}) {
  const [draft, setDraft] = useState<CanonSeasonCreateRequest>(emptySeasonDraft);

  function update<K extends keyof CanonSeasonCreateRequest>(key: K, value: CanonSeasonCreateRequest[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <DialogShell
      labelledBy="create-season-title"
      onClose={onCancel}
      panelClassName="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl"
    >
      <h2 className="text-lg font-semibold" id="create-season-title">Create Season</h2>
      <form
        className="mt-5 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({ ...draft, title: draft.title.trim(), description: draft.description?.trim() });
        }}
      >
        <label className="grid gap-1.5 text-sm font-medium">
          Title
          <input className={fieldClassName} required value={draft.title} onChange={(event) => update("title", event.target.value)} />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Theme
          <select className={fieldClassName} value={draft.theme} onChange={(event) => update("theme", event.target.value as CanonThemeKey)}>
            {canonThemes.map((theme) => <option key={theme.key} value={theme.key}>{theme.label}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Description
          <textarea className={fieldClassName} rows={4} value={draft.description ?? ""} onChange={(event) => update("description", event.target.value)} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium">
            Start date
            <input className={fieldClassName} type="date" value={draft.startDate ?? ""} onChange={(event) => update("startDate", event.target.value || null)} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            End date
            <input className={fieldClassName} type="date" value={draft.endDate ?? ""} onChange={(event) => update("endDate", event.target.value || null)} />
          </label>
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button type="submit">Save Season</Button>
        </div>
      </form>
    </DialogShell>
  );
}

function SuccessMessage({ message }: { message: string }) {
  return <div className="rounded-2xl border border-worth/30 bg-worth/10 p-4 text-sm font-medium text-worth">{message}</div>;
}

const fieldClassName = "rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
