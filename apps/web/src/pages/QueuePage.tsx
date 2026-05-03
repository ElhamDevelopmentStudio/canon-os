import {
  MEDIA_TYPES,
  QUEUE_PRIORITIES,
  type MediaType,
  type QueueItem,
  type QueuePriority,
  type QueueRecalculateSummary,
} from "@canonos/contracts";
import { ArrowDown, ArrowUp, Pencil, Plus, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { MediaTypeBadge } from "@/components/data-display/MediaTypeBadge";
import { StatusPill } from "@/components/data-display/StatusPill";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { CommandSearchInput } from "@/components/forms/CommandSearchInput";
import { PageActionBar } from "@/components/layout/PageActionBar";
import { PageSubtitle, PageTitle } from "@/components/layout/PageText";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { mediaTypeLabels } from "@/features/media/mediaLabels";
import {
  createQueueItem,
  deleteQueueItem,
  recalculateQueue,
  reorderQueueItems,
  updateQueueItem,
  useQueueItems,
} from "@/features/queue/queueApi";
import { queuePriorityLabels, queuePriorityTone } from "@/features/queue/queueLabels";
import { cn } from "@/lib/utils";

const columnPriorities: QueuePriority[] = ["start_soon", "sample_first", "later"];

type QueueDraft = {
  title: string;
  mediaType: MediaType;
  priority: QueuePriority;
  reason: string;
  estimatedTimeMinutes: string;
  bestMood: string;
};

const emptyDraft: QueueDraft = {
  title: "",
  mediaType: "movie",
  priority: "start_soon",
  reason: "",
  estimatedTimeMinutes: "120",
  bestMood: "",
};

export function QueuePage() {
  const [search, setSearch] = useState("");
  const [mediaType, setMediaType] = useState<MediaType | "">("");
  const [priority, setPriority] = useState<QueuePriority | "">("");
  const [editingItem, setEditingItem] = useState<QueueItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<QueueItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [lastRecalculationSummary, setLastRecalculationSummary] = useState<QueueRecalculateSummary | null>(null);
  const { data, error, isLoading, mutate } = useQueueItems({ mediaType, priority, search });
  const items = useMemo(() => data?.results ?? [], [data]);
  const activeItems = useMemo(() => items.filter((item) => !item.isArchived), [items]);
  const archivedItems = useMemo(() => items.filter((item) => item.isArchived), [items]);
  const queueSummary = useMemo(
    () => lastRecalculationSummary ?? summarizeQueue(items),
    [items, lastRecalculationSummary],
  );

  function openAddModal() {
    setEditingItem(null);
    setIsModalOpen(true);
    setActionError(null);
    setActionMessage(null);
  }

  function openEditModal(item: QueueItem) {
    setEditingItem(item);
    setIsModalOpen(true);
    setActionError(null);
    setActionMessage(null);
  }

  async function moveItem(item: QueueItem, direction: "up" | "down") {
    const ordered = [...items].sort((a, b) => a.queuePosition - b.queuePosition);
    const index = ordered.findIndex((current) => current.id === item.id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setActionError(null);
    try {
      await reorderQueueItems(next.map((current) => current.id));
      await mutate();
      setActionMessage("Queue order updated.");
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Could not reorder queue.");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setActionError(null);
    try {
      await deleteQueueItem(deleteTarget.id);
      setDeleteTarget(null);
      await mutate();
      setActionMessage("Queue item removed.");
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Could not remove queue item.");
    }
  }

  async function runRecalculation() {
    setActionError(null);
    setActionMessage(null);
    setIsRecalculating(true);
    try {
      const response = await recalculateQueue();
      setLastRecalculationSummary(response.summary);
      await mutate();
      setActionMessage("Queue recalculated with mood fit, freshness, and commitment cost.");
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Could not recalculate queue.");
    } finally {
      setIsRecalculating(false);
    }
  }

  async function restoreArchivedItem(item: QueueItem) {
    setActionError(null);
    setActionMessage(null);
    try {
      await updateQueueItem(item.id, {
        isArchived: false,
        priority: "sample_first",
        freshnessScore: Math.max(item.freshnessScore, 55),
      });
      await mutate();
      setActionMessage(`${item.title} restored to Sample First.`);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Could not restore queue item.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <PageTitle>Adaptive Queue</PageTitle>
        <PageSubtitle>Prioritize what deserves your time now, what should be sampled, and what should wait.</PageSubtitle>
      </section>

      <SectionCard title="Queue controls">
        <PageActionBar className="justify-between">
          <div className="grid w-full gap-3 lg:grid-cols-[minmax(16rem,1fr)_12rem_12rem]">
            <CommandSearchInput value={search} onChange={(event) => setSearch(event.target.value)} />
            <label className="grid gap-1 text-sm font-medium">
              <span className="sr-only">Filter by medium</span>
              <select
                className={fieldClassName}
                value={mediaType}
                onChange={(event) => setMediaType(event.target.value as MediaType | "")}
              >
                <option value="">All media types</option>
                {MEDIA_TYPES.map((type) => <option key={type} value={type}>{mediaTypeLabels[type]}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              <span className="sr-only">Filter by priority</span>
              <select
                className={fieldClassName}
                value={priority}
                onChange={(event) => setPriority(event.target.value as QueuePriority | "")}
              >
                <option value="">All priorities</option>
                {QUEUE_PRIORITIES.map((itemPriority) => <option key={itemPriority} value={itemPriority}>{queuePriorityLabels[itemPriority]}</option>)}
              </select>
            </label>
          </div>
          <Button className="w-full gap-2 sm:w-auto" type="button" onClick={openAddModal}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add Queue Item
          </Button>
          <Button
            className="w-full gap-2 sm:w-auto"
            disabled={isRecalculating}
            type="button"
            variant="secondary"
            onClick={() => void runRecalculation()}
          >
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            {isRecalculating ? "Recalculating..." : "Recalculate Queue"}
          </Button>
        </PageActionBar>
      </SectionCard>

      {isLoading ? <LoadingState title="Loading queue" message="Fetching your current queue cards." /> : null}
      {error ? <ErrorState title="Queue unavailable" message={error.message} onRetry={() => void mutate()} /> : null}
      {actionError ? <ErrorState title="Queue action failed" message={actionError} /> : null}
      {actionMessage ? <SuccessMessage message={actionMessage} /> : null}
      {!isLoading && !error && items.length > 0 ? (
        <QueueInsights summary={queueSummary} />
      ) : null}
      {!isLoading && !error && items.length === 0 ? (
        <EmptyState
          title="No queue items match this view"
          message="Add a queue item manually or send one from the Candidate Evaluator."
          actionLabel="Add Queue Item"
          onAction={openAddModal}
        />
      ) : null}
      {!isLoading && !error && activeItems.length > 0 ? (
        <div className="grid gap-6 xl:grid-cols-3">
          {columnPriorities.map((columnPriority) => (
            <QueueColumn
              items={activeItems.filter((item) => item.priority === columnPriority)}
              key={columnPriority}
              priority={columnPriority}
              onDelete={setDeleteTarget}
              onEdit={openEditModal}
              onMove={moveItem}
            />
          ))}
        </div>
      ) : null}

      {!isLoading && !error && items.length > 0 ? (
        <ArchiveSection items={archivedItems} onDelete={setDeleteTarget} onRestore={restoreArchivedItem} />
      ) : null}

      <SectionCard title="Queue rules">
        <h2 className="text-lg font-semibold">Queue Rules</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Do not keep low-confidence items forever. Sample uncertain series before committing. Delay good items when mood, energy, or time cost is wrong.
        </p>
      </SectionCard>

      <QueueItemModal
        item={editingItem}
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={async () => {
          await mutate();
          setActionMessage(editingItem ? "Queue item updated." : "Queue item added.");
        }}
      />
      <DeleteQueueItemDialog item={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={() => void confirmDelete()} />
    </div>
  );
}

function QueueColumn({
  items,
  priority,
  onDelete,
  onEdit,
  onMove,
}: {
  items: QueueItem[];
  priority: QueuePriority;
  onDelete: (item: QueueItem) => void;
  onEdit: (item: QueueItem) => void;
  onMove: (item: QueueItem, direction: "up" | "down") => void;
}) {
  return (
    <SectionCard title={queuePriorityLabels[priority]}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{queuePriorityLabels[priority]}</h2>
        <StatusPill label={`${items.length} item${items.length === 1 ? "" : "s"}`} tone={queuePriorityTone[priority]} />
      </div>
      <div className="mt-4 grid gap-4">
        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">Nothing in this lane yet.</p>
        ) : null}
        {items.map((item) => <QueueCard item={item} key={item.id} onDelete={onDelete} onEdit={onEdit} onMove={onMove} />)}
      </div>
    </SectionCard>
  );
}

function QueueCard({
  item,
  onDelete,
  onEdit,
  onMove,
}: {
  item: QueueItem;
  onDelete: (item: QueueItem) => void;
  onEdit: (item: QueueItem) => void;
  onMove: (item: QueueItem, direction: "up" | "down") => void;
}) {
  return (
    <article className="rounded-2xl border border-border bg-background p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{item.title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <MediaTypeBadge type={item.mediaType} label={mediaTypeLabels[item.mediaType]} />
            <StatusPill label={queuePriorityLabels[item.priority]} tone={queuePriorityTone[item.priority]} />
          </div>
        </div>
        <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">#{item.queuePosition}</span>
      </div>
      <dl className="mt-4 grid gap-2 text-sm leading-6">
        <div><dt className="inline font-semibold">Best mood: </dt><dd className="inline text-muted-foreground">{item.bestMood || "Not specified"}</dd></div>
        <div><dt className="inline font-semibold">Time: </dt><dd className="inline text-muted-foreground">{item.estimatedTimeMinutes ? `${item.estimatedTimeMinutes} min` : "Unknown"}</dd></div>
        <div><dt className="inline font-semibold">Reason: </dt><dd className="inline text-muted-foreground">{item.reason || "No reason recorded yet."}</dd></div>
      </dl>
      <div className="mt-4 grid gap-3">
        <MetricBar label="Mood compatibility" max={100} value={item.moodCompatibility} />
        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
          <MetricBadge label="Intensity" value={`${item.intensityLevel}/10`} />
          <MetricBadge label="Complexity" value={`${item.complexityLevel}/10`} />
          <MetricBadge label="Commitment" value={`${item.commitmentLevel}/10`} />
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <StatusPill label={`${Math.round(item.freshnessScore)}% freshness`} tone={item.freshnessScore < 40 ? "warning" : "success"} />
          <StatusPill label={`${item.timesRecommended} recommendation${item.timesRecommended === 1 ? "" : "s"}`} tone={item.timesRecommended >= 3 ? "warning" : "neutral"} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button aria-label={`Move ${item.title} up`} size="sm" type="button" variant="secondary" onClick={() => onMove(item, "up")}><ArrowUp aria-hidden="true" className="h-4 w-4" /></Button>
        <Button aria-label={`Move ${item.title} down`} size="sm" type="button" variant="secondary" onClick={() => onMove(item, "down")}><ArrowDown aria-hidden="true" className="h-4 w-4" /></Button>
        <Button aria-label={`Edit ${item.title}`} size="sm" type="button" variant="ghost" onClick={() => onEdit(item)}><Pencil aria-hidden="true" className="h-4 w-4" /></Button>
        <Button aria-label={`Remove ${item.title}`} size="sm" type="button" variant="ghost" onClick={() => onDelete(item)}><Trash2 aria-hidden="true" className="h-4 w-4" /></Button>
      </div>
    </article>
  );
}

function QueueInsights({ summary }: { summary: QueueRecalculateSummary }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <SectionCard title="Queue insight">
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill label={`${summary.activeCount} active`} tone="success" />
          <StatusPill label={`${summary.archivedCount} archived`} tone={summary.archivedCount > 0 ? "warning" : "neutral"} />
          <StatusPill label={`${Math.round(summary.averageScore)} average fit`} tone={summary.averageScore >= 60 ? "success" : "warning"} />
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{summary.topInsight}</p>
      </SectionCard>
      <SectionCard title="Queue fatigue warnings">
        {summary.fatigueWarnings.length > 0 ? (
          <ul className="grid gap-2 text-sm leading-6 text-risky">
            {summary.fatigueWarnings.map((warning) => (
              <li key={warning}>• {warning}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            No fatigue warnings yet. Recalculate after several Tonight Mode sessions to catch stale or over-recommended items.
          </p>
        )}
      </SectionCard>
    </div>
  );
}

function ArchiveSection({
  items,
  onDelete,
  onRestore,
}: {
  items: QueueItem[];
  onDelete: (item: QueueItem) => void;
  onRestore: (item: QueueItem) => void | Promise<void>;
}) {
  return (
    <SectionCard title="Low-priority archive">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Low-priority archive</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Archived items stay out of Tonight Mode until you restore them.
          </p>
        </div>
        <StatusPill label={`${items.length} archived`} tone={items.length > 0 ? "warning" : "neutral"} />
      </div>
      {items.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          Nothing is archived. Low-fit or fatigued items will land here after recalculation.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {items.map((item) => (
            <article className="rounded-2xl border border-border bg-background p-4" key={item.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {Math.round(item.freshnessScore)}% freshness · {item.commitmentLevel}/10 commitment
                  </p>
                </div>
                <MediaTypeBadge type={item.mediaType} label={mediaTypeLabels[item.mediaType]} />
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.reason || "Archived because it is not a strong fit right now."}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button className="gap-2" size="sm" type="button" variant="secondary" onClick={() => void onRestore(item)}>
                  <RotateCcw aria-hidden="true" className="h-4 w-4" />
                  Restore
                </Button>
                <Button aria-label={`Remove ${item.title}`} size="sm" type="button" variant="ghost" onClick={() => onDelete(item)}>
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function MetricBar({ label, max, value }: { label: string; max: number; value: number }) {
  const width = `${Math.min(Math.max((value / max) * 100, 0), 100)}%`;
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-2 text-xs font-semibold">
        <span>{label}</span>
        <span className="text-muted-foreground">{Math.round(value)}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div className="h-2 rounded-full bg-primary" style={{ width }} />
      </div>
    </div>
  );
}

function MetricBadge({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-xl border border-border bg-muted/40 px-2.5 py-2">
      <span className="font-semibold text-foreground">{label}: </span>
      {value}
    </span>
  );
}

function QueueItemModal({ item, open, onClose, onSaved }: { item: QueueItem | null; open: boolean; onClose: () => void; onSaved: () => void | Promise<void> }) {
  const [draft, setDraft] = useState<QueueDraft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(item ? queueItemToDraft(item) : emptyDraft);
    setError(null);
  }, [item, open]);

  if (!open) return null;

  function updateDraft(field: keyof QueueDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function saveQueueItem() {
    const title = draft.title.trim();
    if (!title) {
      setError("Add a title before saving this queue item.");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      const request = {
        title,
        mediaType: draft.mediaType,
        priority: draft.priority,
        reason: draft.reason.trim(),
        bestMood: draft.bestMood.trim(),
        estimatedTimeMinutes: parseOptionalInteger(draft.estimatedTimeMinutes),
      };
      if (item) {
        await updateQueueItem(item.id, request);
      } else {
        await createQueueItem(request);
      }
      await onSaved();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save queue item.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div aria-labelledby="queue-modal-title" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm" role="dialog">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h2 className="text-lg font-semibold" id="queue-modal-title">{item ? "Edit Queue Item" : "Add Queue Item"}</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <TextField label="Title" value={draft.title} onChange={(value) => updateDraft("title", value)} />
          <label className="grid gap-1.5 text-sm font-medium">
            Media type
            <select
              className={fieldClassName}
              value={draft.mediaType}
              onChange={(event) => updateDraft("mediaType", event.target.value as MediaType)}
            >
              {MEDIA_TYPES.map((type) => <option key={type} value={type}>{mediaTypeLabels[type]}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Priority
            <select
              className={fieldClassName}
              value={draft.priority}
              onChange={(event) => updateDraft("priority", event.target.value as QueuePriority)}
            >
              {QUEUE_PRIORITIES.map((itemPriority) => <option key={itemPriority} value={itemPriority}>{queuePriorityLabels[itemPriority]}</option>)}
            </select>
          </label>
          <TextField label="Estimated time (minutes)" type="number" value={draft.estimatedTimeMinutes} onChange={(value) => updateDraft("estimatedTimeMinutes", value)} />
          <TextField label="Best mood" value={draft.bestMood} onChange={(value) => updateDraft("bestMood", value)} />
        </div>
        <label className="mt-4 grid gap-1.5 text-sm font-medium">
          Reason
          <textarea className={cn(fieldClassName, "min-h-24 resize-y py-3")} value={draft.reason} onChange={(event) => updateDraft("reason", event.target.value)} />
        </label>
        {error ? <p className="mt-3 text-sm font-medium text-avoid" role="alert">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={isSaving} type="button" onClick={() => void saveQueueItem()}>{isSaving ? "Saving..." : "Save"}</Button>
        </div>
      </div>
    </div>
  );
}

function TextField({ label, type = "text", value, onChange }: { label: string; type?: "number" | "text"; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <input className={fieldClassName} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function DeleteQueueItemDialog({ item, onCancel, onConfirm }: { item: QueueItem | null; onCancel: () => void; onConfirm: () => void }) {
  if (!item) return null;
  return (
    <div aria-labelledby="delete-queue-title" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm" role="dialog">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h2 className="text-lg font-semibold" id="delete-queue-title">Remove queue item?</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">This removes “{item.title}” from the queue only. It does not delete linked media or candidate records.</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button className="bg-avoid text-white hover:bg-avoid/90" type="button" onClick={onConfirm}>Remove</Button>
        </div>
      </div>
    </div>
  );
}

function SuccessMessage({ message }: { message: string }) {
  return <div className="rounded-2xl border border-promising/30 bg-promising/10 p-4 text-sm font-medium text-promising" role="status">{message}</div>;
}

function parseOptionalInteger(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function queueItemToDraft(item: QueueItem): QueueDraft {
  return {
    title: item.title,
    mediaType: item.mediaType,
    priority: item.priority,
    reason: item.reason,
    estimatedTimeMinutes: item.estimatedTimeMinutes?.toString() ?? "",
    bestMood: item.bestMood,
  };
}

function summarizeQueue(items: QueueItem[]): QueueRecalculateSummary {
  const activeItems = items.filter((item) => !item.isArchived);
  const archivedItems = items.filter((item) => item.isArchived);
  const averageScore = activeItems.length
    ? activeItems.reduce((total, item) => total + approximateQueueFit(item), 0) / activeItems.length
    : 0;
  const topItem = activeItems.reduce<QueueItem | null>((best, item) => {
    if (!best) return item;
    return approximateQueueFit(item) > approximateQueueFit(best) ? item : best;
  }, null);
  const warnings: string[] = [];
  const repeated = activeItems.filter((item) => item.timesRecommended >= 3).length;
  const stale = activeItems.filter((item) => item.freshnessScore < 40).length;
  const highCommitment = activeItems.filter((item) => item.commitmentLevel >= 8 && item.priority === "start_soon").length;
  if (repeated) warnings.push(`${repeated} active item(s) have been recommended repeatedly.`);
  if (stale) warnings.push(`${stale} active item(s) have low freshness.`);
  if (highCommitment) warnings.push(`${highCommitment} high-commitment item(s) are still Start Soon.`);
  return {
    activeCount: activeItems.length,
    archivedCount: archivedItems.length,
    averageScore,
    topInsight: topItem
      ? `${topItem.title} currently looks strongest based on mood compatibility and freshness.`
      : "No active queue items are ready; add or restore items before Tonight Mode.",
    fatigueWarnings: warnings,
  };
}

function approximateQueueFit(item: QueueItem): number {
  return Math.max(
    0,
    Math.min(
      100,
      item.moodCompatibility * 0.45
      + item.freshnessScore * 0.35
      + (10 - item.commitmentLevel) * 2
      - Math.max(item.complexityLevel - 7, 0) * 3,
    ),
  );
}

const fieldClassName = cn(
  "h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary",
);
