import type { CanonSeason, CanonSeasonCreateRequest, CanonThemeKey } from "@canonos/contracts";
import { ArrowRight, BookMarked, Calendar, CheckCircle2, Layers3, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { APP_ROUTES } from "@/app/routeConstants";
import { StatusPill } from "@/components/data-display/StatusPill";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { DialogShell } from "@/components/feedback/DialogShell";
import { LoadingState } from "@/components/feedback/LoadingState";
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
  const activeSeasonCount = seasons.filter((season) => season.status === "active").length;
  const completedItemCount = seasons.reduce((total, season) => total + season.completedItemCount, 0);
  const totalItemCount = seasons.reduce((total, season) => total + season.itemCount, 0);

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
    <div className="grid gap-6">
      <section className="border-b border-border pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Season desk</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">Personal Canon</h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Build themed exploration seasons with ordered works, reasons, attention notes, and reflection prompts.
            </p>
          </div>
          <Button className="gap-2" type="button" onClick={() => setIsModalOpen(true)}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            Create Season
          </Button>
        </div>
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
        <>
          <section aria-label="Season overview" className="grid gap-4 border-y border-border py-4 md:grid-cols-3">
            <SeasonSignal label="Seasons" value={String(seasons.length)} helper="Curated programs on the board." />
            <SeasonSignal label="Active" value={String(activeSeasonCount)} helper="Exploration paths currently live." />
            <SeasonSignal label="Works" value={`${completedItemCount}/${totalItemCount}`} helper="Completed across every season." />
          </section>

          <section aria-label="Canon seasons" className="grid gap-4">
            {seasons.map((season) => <SeasonCard key={season.id} season={season} />)}
          </section>
        </>
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
  const progressPercent = Math.min(Math.max(season.progressPercent, 0), 100);

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border bg-card/60 p-5 shadow-sm transition hover:border-primary/45 hover:bg-card/80">
      <div className="absolute inset-y-5 left-0 w-1 rounded-r-full bg-primary" aria-hidden="true" />
      <div className="grid gap-5 pl-2 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              <BookMarked aria-hidden="true" className="h-4 w-4" />
              {canonThemeLabels[season.theme]}
            </span>
            <StatusPill label={canonSeasonStatusLabels[season.status]} tone={canonSeasonStatusTone[season.status]} />
          </div>
          <div className="mt-3 min-w-0">
            <h2 className="text-2xl font-semibold tracking-tight">
              <Link className="hover:text-primary" to={`${APP_ROUTES.seasons}/${season.id}`}>
                {season.title}
              </Link>
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {season.description || "No description yet. Define the question this season should answer."}
            </p>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <SeasonMetaChip icon={<Calendar aria-hidden="true" className="h-3.5 w-3.5" />}>
              {season.startDate ? `Starts ${season.startDate}` : "No start date"}
            </SeasonMetaChip>
            <SeasonMetaChip icon={<Layers3 aria-hidden="true" className="h-3.5 w-3.5" />}>
              {season.itemCount === 1 ? "1 work" : `${season.itemCount} works`}
            </SeasonMetaChip>
            <SeasonMetaChip icon={<CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />}>
              {season.completedItemCount} complete
            </SeasonMetaChip>
          </div>
        </div>

        <div className="grid content-between gap-4 border-t border-border pt-4 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
          <div>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Progress</p>
                <p className="mt-1 text-4xl font-semibold tracking-tight">{progressPercent}%</p>
              </div>
              <p className="pb-1 text-sm text-muted-foreground">
                {season.completedItemCount}/{season.itemCount || 0}
              </p>
            </div>
            <div className="mt-4 h-2 rounded-full bg-muted" aria-label={`${season.title} progress`}>
              <div className="h-2 rounded-full bg-primary" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <Button asChild className="justify-between gap-3" size="sm" variant="secondary">
            <Link to={`${APP_ROUTES.seasons}/${season.id}`}>
              Open Season
              <ArrowRight aria-hidden="true" className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

function SeasonSignal({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="border-l border-border pl-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
    </div>
  );
}

function SeasonMetaChip({ children, icon }: { children: ReactNode; icon: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs font-medium text-muted-foreground">
      {icon}
      {children}
    </span>
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
