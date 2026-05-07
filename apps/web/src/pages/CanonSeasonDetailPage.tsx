import type {
  Candidate,
  CanonItemCanonStatus,
  CanonItemCompletionStatus,
  CanonSeasonItem,
  CanonSeasonItemCreateRequest,
  MediaItem,
  MediaType,
} from "@canonos/contracts";
import { ArrowDown, ArrowLeft, ArrowUp, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { APP_ROUTES } from "@/app/routeConstants";
import { MediaTypeBadge } from "@/components/data-display/MediaTypeBadge";
import { StatusPill } from "@/components/data-display/StatusPill";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { DialogShell } from "@/components/feedback/DialogShell";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Button } from "@/components/ui/button";
import {
  addCanonSeasonItem,
  deleteCanonSeasonItem,
  reorderCanonSeasonItems,
  updateCanonSeason,
  updateCanonSeasonItem,
  useCanonSeason,
} from "@/features/canon/canonApi";
import {
  canonItemCanonStatusLabels,
  canonItemCanonStatusTone,
  canonItemStatusLabels,
  canonItemStatusTone,
  canonSeasonStatusLabels,
  canonSeasonStatusTone,
  canonThemeLabels,
} from "@/features/canon/canonLabels";
import { useCandidates } from "@/features/candidate-evaluator/candidateApi";
import { useMediaItems } from "@/features/media/mediaApi";
import { mediaTypeLabels } from "@/features/media/mediaLabels";

const emptyItemDraft: CanonSeasonItemCreateRequest = {
  titleSnapshot: "",
  mediaType: "movie",
  reasonIncluded: "",
  whatToPayAttentionTo: "",
  completionStatus: "planned",
  canonStatus: "unmarked",
};

export function CanonSeasonDetailPage() {
  const { seasonId } = useParams();
  const season = useCanonSeason(seasonId);
  const mediaItems = useMediaItems();
  const candidates = useCandidates();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [reflectionNotes, setReflectionNotes] = useState("");
  const [hasTouchedReflection, setHasTouchedReflection] = useState(false);

  const items = useMemo(() => season.data?.items ?? [], [season.data?.items]);
  const effectiveReflectionNotes = hasTouchedReflection ? reflectionNotes : season.data?.reflectionNotes ?? "";
  const isLoading = season.isLoading || mediaItems.isLoading || candidates.isLoading;
  const loadError = season.error ?? mediaItems.error ?? candidates.error;

  async function refreshSeason() {
    await Promise.all([season.mutate(), mediaItems.mutate(), candidates.mutate()]);
  }

  async function handleAddItem(draft: CanonSeasonItemCreateRequest) {
    if (!seasonId) return;
    setActionError(null);
    setActionMessage(null);
    try {
      await addCanonSeasonItem(seasonId, draft);
      await season.mutate();
      setIsAddModalOpen(false);
      setActionMessage("Canon season item added.");
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Could not add canon season item.");
    }
  }

  async function moveItem(item: CanonSeasonItem, direction: "up" | "down") {
    if (!seasonId) return;
    const ordered = [...items].sort((a, b) => a.order - b.order);
    const index = ordered.findIndex((current) => current.id === item.id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setActionError(null);
    setActionMessage(null);
    try {
      await reorderCanonSeasonItems(seasonId, next.map((current) => current.id));
      await season.mutate();
      setActionMessage("Season order updated.");
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Could not reorder canon season.");
    }
  }

  async function markComplete(item: CanonSeasonItem) {
    if (!seasonId) return;
    setActionError(null);
    setActionMessage(null);
    const nextStatus: CanonItemCompletionStatus = item.completionStatus === "completed" ? "in_progress" : "completed";
    try {
      await updateCanonSeasonItem(seasonId, item.id, { completionStatus: nextStatus });
      await season.mutate();
      setActionMessage(`${item.titleSnapshot} marked as ${canonItemStatusLabels[nextStatus].toLowerCase()}.`);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Could not update canon season item.");
    }
  }

  async function updateItemCanonStatus(item: CanonSeasonItem, canonStatus: CanonItemCanonStatus) {
    if (!seasonId) return;
    setActionError(null);
    setActionMessage(null);
    try {
      await updateCanonSeasonItem(seasonId, item.id, { canonStatus });
      await season.mutate();
      setActionMessage(`${item.titleSnapshot} canon status set to ${canonItemCanonStatusLabels[canonStatus].toLowerCase()}.`);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Could not update canon status.");
    }
  }

  async function removeItem(item: CanonSeasonItem) {
    if (!seasonId) return;
    setActionError(null);
    setActionMessage(null);
    try {
      await deleteCanonSeasonItem(seasonId, item.id);
      await season.mutate();
      setActionMessage(`${item.titleSnapshot} removed from this season.`);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Could not remove canon season item.");
    }
  }

  async function saveReflection() {
    if (!seasonId) return;
    setActionError(null);
    setActionMessage(null);
    try {
      await updateCanonSeason(seasonId, { reflectionNotes: effectiveReflectionNotes });
      await season.mutate();
      setHasTouchedReflection(false);
      setActionMessage("Season reflection saved.");
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Could not save season reflection.");
    }
  }

  if (!seasonId) {
    return <ErrorState title="Season unavailable" message="No canon season id was provided." />;
  }

  return (
    <div className="grid gap-6">
      <section className="border-b border-border pb-5">
        <Button asChild className="mb-4 gap-2 px-0" variant="ghost">
          <Link to={APP_ROUTES.seasons}><ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to Personal Canon</Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Season plan</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">{season.data?.title ?? "Canon Season"}</h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              {season.data ? `${canonThemeLabels[season.data.theme]} · ${season.data.description || "No description yet."}` : "Loading canon season."}
            </p>
          </div>
          {season.data ? <StatusPill label={canonSeasonStatusLabels[season.data.status]} tone={canonSeasonStatusTone[season.data.status]} /> : null}
        </div>
      </section>

      {isLoading ? <LoadingState title="Loading canon season" message="Fetching season items, media, and candidates." /> : null}
      {loadError ? <ErrorState title="Canon season unavailable" message={loadError.message} onRetry={() => void refreshSeason()} /> : null}
      {actionError ? <ErrorState title="Canon action failed" message={actionError} /> : null}
      {actionMessage ? <SuccessMessage message={actionMessage} /> : null}

      {!isLoading && !loadError && season.data ? (
        <>
          <SeasonProgress season={season.data} />
          <section aria-label="Season items" className="border-t border-border pt-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Program order</p>
                <h2 className="mt-1 text-2xl font-semibold text-foreground">Season items</h2>
                <p className="mt-2 text-sm text-muted-foreground">Order works into the path you want to experience and reflect on.</p>
              </div>
              <Button className="gap-2" type="button" onClick={() => setIsAddModalOpen(true)}>
                <Plus aria-hidden="true" className="h-4 w-4" />
                Add Item
              </Button>
            </div>
            {items.length === 0 ? (
              <EmptyState
                title="No season items yet"
                message="Add media, candidates, or custom works to shape this canon season."
                actionLabel="Add Item"
                onAction={() => setIsAddModalOpen(true)}
              />
            ) : (
              <div className="divide-y divide-border border-y border-border">
                {items.map((item, index) => (
                  <SeasonItemCard
                    key={item.id}
                    item={item}
                    canMoveDown={index < items.length - 1}
                    canMoveUp={index > 0}
                    onMarkComplete={() => void markComplete(item)}
                    onCanonStatusChange={(canonStatus) => void updateItemCanonStatus(item, canonStatus)}
                    onMoveDown={() => void moveItem(item, "down")}
                    onMoveUp={() => void moveItem(item, "up")}
                    onRemove={() => void removeItem(item)}
                  />
                ))}
              </div>
            )}
          </section>
          <section aria-label="Season reflection" className="border-t border-border pt-6">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1fr)]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Reflection prompts</p>
                <h2 className="mt-1 text-2xl font-semibold text-foreground">Season reflection</h2>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
                  {season.data.reflectionPrompts.map((prompt) => <li key={prompt}>{prompt}</li>)}
                </ul>
              </div>
              <label className="grid gap-2 text-sm font-medium">
                Summary notes
                <textarea
                  className={fieldClassName}
                  rows={8}
                  value={effectiveReflectionNotes}
                  onChange={(event) => {
                    setHasTouchedReflection(true);
                    setReflectionNotes(event.target.value);
                  }}
                />
                <span className="text-xs font-normal text-muted-foreground">Capture what the ordered season proved, changed, or rejected.</span>
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <Button type="button" onClick={() => void saveReflection()}>Save Reflection</Button>
            </div>
          </section>
        </>
      ) : null}

      {isAddModalOpen && season.data ? (
        <AddItemDialog
          candidates={candidates.data?.results ?? []}
          mediaItems={mediaItems.data?.results ?? []}
          onCancel={() => setIsAddModalOpen(false)}
          onSubmit={(draft) => void handleAddItem(draft)}
        />
      ) : null}
    </div>
  );
}

function SeasonProgress({ season }: { season: NonNullable<ReturnType<typeof useCanonSeason>["data"]> }) {
  return (
    <section aria-label="Season progress" className="grid gap-4 border-y border-border py-4">
      <div className="grid gap-4 md:grid-cols-3">
        <ProgressMetric label="Progress" value={`${season.progressPercent}%`} />
        <ProgressMetric label="Completed" value={`${season.completedItemCount}/${season.itemCount}`} />
        <ProgressMetric label="Theme" value={canonThemeLabels[season.theme]} />
      </div>
      <div className="mt-4 h-2 rounded-full bg-muted" aria-label="Season progress">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${season.progressPercent}%` }} />
      </div>
    </section>
  );
}

function ProgressMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-2xl font-semibold">{value}</p>
    </div>
  );
}

function SeasonItemCard({
  item,
  canMoveDown,
  canMoveUp,
  onMarkComplete,
  onCanonStatusChange,
  onMoveDown,
  onMoveUp,
  onRemove,
}: {
  item: CanonSeasonItem;
  canMoveDown: boolean;
  canMoveUp: boolean;
  onMarkComplete: () => void;
  onCanonStatusChange: (canonStatus: CanonItemCanonStatus) => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRemove: () => void;
}) {
  return (
    <article className="py-5" aria-label={`Season item ${item.titleSnapshot}`}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">#{item.order}</span>
            <MediaTypeBadge label={mediaTypeLabels[item.mediaType]} type={item.mediaType} />
            <StatusPill label={canonItemStatusLabels[item.completionStatus]} tone={canonItemStatusTone[item.completionStatus]} />
            <StatusPill label={canonItemCanonStatusLabels[item.canonStatus]} tone={canonItemCanonStatusTone[item.canonStatus]} />
          </div>
          <h3 className="mt-3 text-lg font-semibold">{item.titleSnapshot}</h3>
        </div>
        <div className="flex flex-wrap gap-2 xl:justify-end">
          <Button aria-label={`Move ${item.titleSnapshot} up`} disabled={!canMoveUp} size="sm" type="button" variant="ghost" onClick={onMoveUp}>
            <ArrowUp aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button aria-label={`Move ${item.titleSnapshot} down`} disabled={!canMoveDown} size="sm" type="button" variant="ghost" onClick={onMoveDown}>
            <ArrowDown aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button className="gap-2" size="sm" type="button" variant="secondary" onClick={onMarkComplete}>
            <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
            {item.completionStatus === "completed" ? "Mark In Progress" : "Mark Complete"}
          </Button>
          <Button aria-label={`Remove ${item.titleSnapshot}`} size="sm" type="button" variant="ghost" onClick={onRemove}>
            <Trash2 aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(14rem,0.45fr)_minmax(0,1fr)]">
        <label className="grid content-start gap-1.5 text-sm font-medium">
          Canon status for {item.titleSnapshot}
          <select
            aria-label={`Canon status for ${item.titleSnapshot}`}
            className={fieldClassName}
            value={item.canonStatus}
            onChange={(event) => onCanonStatusChange(event.target.value as CanonItemCanonStatus)}
          >
            {Object.entries(canonItemCanonStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 md:grid-cols-2">
        <NoteBlock label="Reason included" text={item.reasonIncluded || "No reason captured yet."} />
        <NoteBlock label="What to pay attention to" text={item.whatToPayAttentionTo || "No attention note captured yet."} />
        </div>
      </div>
    </article>
  );
}

function NoteBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="border-l border-border pl-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm leading-6 text-foreground">{text}</p>
    </div>
  );
}

type SourceType = "custom" | "media" | "candidate";

function AddItemDialog({
  candidates,
  mediaItems,
  onCancel,
  onSubmit,
}: {
  candidates: Candidate[];
  mediaItems: MediaItem[];
  onCancel: () => void;
  onSubmit: (draft: CanonSeasonItemCreateRequest) => void;
}) {
  const [sourceType, setSourceType] = useState<SourceType>("custom");
  const [mediaItemId, setMediaItemId] = useState(mediaItems[0]?.id ?? "");
  const [candidateId, setCandidateId] = useState(candidates[0]?.id ?? "");
  const [draft, setDraft] = useState<CanonSeasonItemCreateRequest>(emptyItemDraft);

  function update<K extends keyof CanonSeasonItemCreateRequest>(key: K, value: CanonSeasonItemCreateRequest[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function buildPayload(): CanonSeasonItemCreateRequest {
    if (sourceType === "media") {
      return {
        mediaItemId,
        reasonIncluded: draft.reasonIncluded,
        whatToPayAttentionTo: draft.whatToPayAttentionTo,
        completionStatus: draft.completionStatus,
        canonStatus: draft.canonStatus,
      };
    }
    if (sourceType === "candidate") {
      return {
        candidateId,
        reasonIncluded: draft.reasonIncluded,
        whatToPayAttentionTo: draft.whatToPayAttentionTo,
        completionStatus: draft.completionStatus,
        canonStatus: draft.canonStatus,
      };
    }
    return {
      ...draft,
      titleSnapshot: draft.titleSnapshot?.trim(),
      reasonIncluded: draft.reasonIncluded?.trim(),
      whatToPayAttentionTo: draft.whatToPayAttentionTo?.trim(),
    };
  }

  return (
    <DialogShell
      labelledBy="add-season-item-title"
      onClose={onCancel}
      panelClassName="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl"
    >
      <h2 className="text-lg font-semibold" id="add-season-item-title">Add Season Item</h2>
      <form
        className="mt-5 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(buildPayload());
        }}
      >
          <label className="grid gap-1.5 text-sm font-medium">
            Source type
            <select
              aria-label="Source type"
              className={fieldClassName}
              value={sourceType}
              onChange={(event) => setSourceType(event.target.value as SourceType)}
            >
              <option value="custom">Custom item</option>
              <option value="media">Media item</option>
              <option value="candidate">Candidate</option>
            </select>
          </label>

          {sourceType === "media" ? (
            <label className="grid gap-1.5 text-sm font-medium">
              Media item
              <select
                aria-label="Media item"
                className={fieldClassName}
                required
                value={mediaItemId}
                onChange={(event) => setMediaItemId(event.target.value)}
              >
                {mediaItems.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
            </label>
          ) : null}

          {sourceType === "candidate" ? (
            <label className="grid gap-1.5 text-sm font-medium">
              Candidate
              <select
                aria-label="Candidate"
                className={fieldClassName}
                required
                value={candidateId}
                onChange={(event) => setCandidateId(event.target.value)}
              >
                {candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title}</option>)}
              </select>
            </label>
          ) : null}

          {sourceType === "custom" ? (
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
              <label className="grid gap-1.5 text-sm font-medium">
                Title
                <input className={fieldClassName} required value={draft.titleSnapshot ?? ""} onChange={(event) => update("titleSnapshot", event.target.value)} />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Media type
                <select className={fieldClassName} value={draft.mediaType ?? "movie"} onChange={(event) => update("mediaType", event.target.value as MediaType)}>
                  {Object.entries(mediaTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            </div>
          ) : null}

          <label className="grid gap-1.5 text-sm font-medium">
            Reason included
            <textarea className={fieldClassName} rows={3} value={draft.reasonIncluded ?? ""} onChange={(event) => update("reasonIncluded", event.target.value)} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            What to pay attention to
            <textarea className={fieldClassName} rows={3} value={draft.whatToPayAttentionTo ?? ""} onChange={(event) => update("whatToPayAttentionTo", event.target.value)} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Canon status
            <select
              aria-label="Canon status"
              className={fieldClassName}
              value={draft.canonStatus ?? "unmarked"}
              onChange={(event) => update("canonStatus", event.target.value as CanonItemCanonStatus)}
            >
              {Object.entries(canonItemCanonStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
            <Button type="submit">Save Item</Button>
          </div>
      </form>
    </DialogShell>
  );
}

function SuccessMessage({ message }: { message: string }) {
  return <div className="rounded-2xl border border-worth/30 bg-worth/10 p-4 text-sm font-medium text-worth">{message}</div>;
}

const fieldClassName = "rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
