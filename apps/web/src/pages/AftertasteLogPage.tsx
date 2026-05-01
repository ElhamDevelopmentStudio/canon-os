import type {
  AftertasteAppetiteEffect,
  AftertasteEntry,
  AftertastePrompt,
  MediaItem,
} from "@canonos/contracts";
import { AFTERTASTE_APPETITE_EFFECTS } from "@canonos/contracts";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { PageActionBar } from "@/components/layout/PageActionBar";
import { PageSubtitle, PageTitle } from "@/components/layout/PageText";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import {
  createAftertasteEntry,
  deleteAftertasteEntry,
  updateAftertasteEntry,
  useAftertasteEntries,
  useAftertastePrompts,
} from "@/features/aftertaste/aftertasteApi";
import { appetiteEffectLabels, booleanLabel } from "@/features/aftertaste/aftertasteLabels";
import { useMediaItems } from "@/features/media/mediaApi";
import { cn } from "@/lib/utils";

const fieldClassName = cn(
  "h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary",
);

const textAreaClassName = cn(fieldClassName, "min-h-24 resize-y py-3");

type AftertasteDraft = {
  mediaItemId: string;
  worthTime: "true" | "false";
  stayedWithMeScore: string;
  feltAlive: "true" | "false";
  feltGeneric: "true" | "false";
  completionReason: string;
  whatWorked: string;
  whatFailed: string;
  finalThoughts: string;
  appetiteEffect: AftertasteAppetiteEffect;
};

const emptyDraft: AftertasteDraft = {
  mediaItemId: "",
  worthTime: "true",
  stayedWithMeScore: "7",
  feltAlive: "true",
  feltGeneric: "false",
  completionReason: "Completed",
  whatWorked: "",
  whatFailed: "",
  finalThoughts: "",
  appetiteEffect: "no_change",
};

export function AftertasteLogPage() {
  const { data, error, isLoading, mutate } = useAftertasteEntries();
  const { data: mediaData, error: mediaError, isLoading: isLoadingMedia } = useMediaItems();
  const { data: prompts, error: promptsError, isLoading: isLoadingPrompts } = useAftertastePrompts();
  const [editingEntry, setEditingEntry] = useState<AftertasteEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AftertasteEntry | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const entries = useMemo(() => data?.results ?? [], [data]);
  const mediaItems = useMemo(() => mediaData?.results ?? [], [mediaData]);

  function openNewModal() {
    setEditingEntry(null);
    setIsModalOpen(true);
    setActionError(null);
    setActionMessage(null);
  }

  function openEditModal(entry: AftertasteEntry) {
    setEditingEntry(entry);
    setIsModalOpen(true);
    setActionError(null);
    setActionMessage(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setActionError(null);
    try {
      await deleteAftertasteEntry(deleteTarget.id);
      setDeleteTarget(null);
      await mutate();
      setActionMessage("Aftertaste entry deleted.");
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Could not delete aftertaste entry.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <PageTitle>Aftertaste Log</PageTitle>
        <PageSubtitle>
          Reflect after finishing, dropping, or pausing a work so future choices learn the deeper signal.
        </PageSubtitle>
      </section>

      <SectionCard title="Aftertaste controls">
        <PageActionBar className="justify-between">
          <div>
            <h2 className="text-lg font-semibold">Reflection queue</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Record what stayed, what felt generic, and whether this kind of work should come back.
            </p>
          </div>
          <Button className="w-full gap-2 sm:w-auto" type="button" onClick={openNewModal}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            New Reflection
          </Button>
        </PageActionBar>
      </SectionCard>

      {isLoading ? <LoadingState title="Loading aftertaste log" message="Fetching your reflections." /> : null}
      {error ? <ErrorState title="Aftertaste log unavailable" message={error.message} onRetry={() => void mutate()} /> : null}
      {actionError ? <ErrorState title="Aftertaste action failed" message={actionError} /> : null}
      {actionMessage ? <SuccessMessage message={actionMessage} /> : null}
      {!isLoading && !error && entries.length === 0 ? (
        <EmptyState
          title="No aftertaste entries yet"
          message="Create a reflection after finishing or dropping a work. The best entries capture what still lingers after the credits roll."
          actionLabel="New Reflection"
          onAction={openNewModal}
        />
      ) : null}
      {!isLoading && !error && entries.length > 0 ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {entries.map((entry) => (
            <AftertasteEntryCard entry={entry} key={entry.id} onDelete={setDeleteTarget} onEdit={openEditModal} />
          ))}
        </section>
      ) : null}

      <SectionCard title="Default prompts">
        {isLoadingPrompts ? <LoadingState title="Loading prompts" message="Fetching reflection prompts." /> : null}
        {promptsError ? <ErrorState title="Prompts unavailable" message={promptsError.message} /> : null}
        {!isLoadingPrompts && !promptsError ? <PromptList prompts={prompts ?? []} /> : null}
      </SectionCard>

      <AftertasteEntryModal
        entry={editingEntry}
        isLoadingMedia={isLoadingMedia}
        mediaError={mediaError instanceof Error ? mediaError.message : null}
        mediaItems={mediaItems}
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={async () => {
          await mutate();
          setActionMessage(editingEntry ? "Aftertaste entry updated." : "Aftertaste entry saved.");
        }}
      />
      <DeleteAftertasteDialog entry={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={() => void confirmDelete()} />
    </div>
  );
}

function PromptList({ prompts }: { prompts: AftertastePrompt[] }) {
  if (prompts.length === 0) {
    return <EmptyState title="No prompts available" message="The default prompt list is unavailable." />;
  }

  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {prompts.map((prompt) => (
        <li className="rounded-2xl border border-border bg-background p-4" key={prompt.id}>
          <h3 className="font-semibold">{prompt.label}</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{prompt.helperText}</p>
        </li>
      ))}
    </ul>
  );
}

function AftertasteEntryCard({
  entry,
  onDelete,
  onEdit,
}: {
  entry: AftertasteEntry;
  onDelete: (entry: AftertasteEntry) => void;
  onEdit: (entry: AftertasteEntry) => void;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{entry.mediaTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{entry.completionReason || "No completion reason recorded"}</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          Stayed {entry.stayedWithMeScore}/10
        </span>
      </div>
      <dl className="mt-4 grid gap-2 text-sm leading-6 sm:grid-cols-2">
        <InlineMetric label="Worth time" value={booleanLabel(entry.worthTime)} />
        <InlineMetric label="Felt generic" value={booleanLabel(entry.feltGeneric)} />
        <InlineMetric label="Felt alive" value={booleanLabel(entry.feltAlive)} />
        <InlineMetric label="Appetite" value={appetiteEffectLabels[entry.appetiteEffect]} />
      </dl>
      <div className="mt-4 rounded-2xl bg-muted/50 p-4">
        <h3 className="text-sm font-semibold">Final thoughts</h3>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
          {entry.finalThoughts || "No final thoughts recorded yet."}
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button aria-label={`Edit reflection for ${entry.mediaTitle}`} size="sm" type="button" variant="secondary" onClick={() => onEdit(entry)}>
          <Pencil aria-hidden="true" className="h-4 w-4" />
        </Button>
        <Button aria-label={`Delete reflection for ${entry.mediaTitle}`} size="sm" type="button" variant="ghost" onClick={() => onDelete(entry)}>
          <Trash2 aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>
    </article>
  );
}

function InlineMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="inline font-semibold">{label}: </dt>
      <dd className="inline text-muted-foreground">{value}</dd>
    </div>
  );
}

function AftertasteEntryModal({
  entry,
  isLoadingMedia,
  mediaError,
  mediaItems,
  open,
  onClose,
  onSaved,
}: {
  entry: AftertasteEntry | null;
  isLoadingMedia: boolean;
  mediaError: string | null;
  mediaItems: MediaItem[];
  open: boolean;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [draft, setDraft] = useState<AftertasteDraft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(entry ? entryToDraft(entry) : { ...emptyDraft, mediaItemId: mediaItems[0]?.id ?? "" });
    setError(null);
  }, [entry, mediaItems, open]);

  if (!open) return null;

  function updateDraft(field: keyof AftertasteDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function saveEntry() {
    if (!draft.mediaItemId) {
      setError("Choose a media item before saving this reflection.");
      return;
    }
    const stayedScore = Number.parseInt(draft.stayedWithMeScore, 10);
    if (Number.isNaN(stayedScore) || stayedScore < 0 || stayedScore > 10) {
      setError("Stayed with me score must be between 0 and 10.");
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      const request = {
        mediaItemId: draft.mediaItemId,
        worthTime: draft.worthTime === "true",
        stayedWithMeScore: stayedScore,
        feltAlive: draft.feltAlive === "true",
        feltGeneric: draft.feltGeneric === "true",
        completionReason: draft.completionReason.trim(),
        whatWorked: draft.whatWorked.trim(),
        whatFailed: draft.whatFailed.trim(),
        finalThoughts: draft.finalThoughts.trim(),
        appetiteEffect: draft.appetiteEffect,
      };
      if (entry) {
        await updateAftertasteEntry(entry.id, request);
      } else {
        await createAftertasteEntry(request);
      }
      await onSaved();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save aftertaste entry.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div aria-labelledby="aftertaste-modal-title" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm" role="dialog">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h2 className="text-lg font-semibold" id="aftertaste-modal-title">
          {entry ? "Edit Reflection" : "New Reflection"}
        </h2>
        {isLoadingMedia ? <LoadingState title="Loading media choices" message="Fetching media items for this reflection." /> : null}
        {mediaError ? <ErrorState title="Media choices unavailable" message={mediaError} /> : null}
        {!isLoadingMedia && !mediaError && mediaItems.length === 0 ? (
          <EmptyState title="Add media first" message="Create a library item before logging aftertaste." />
        ) : null}
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
            Media item
            <select className={fieldClassName} value={draft.mediaItemId} onChange={(event) => updateDraft("mediaItemId", event.target.value)}>
              <option value="">Choose media</option>
              {mediaItems.map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
          </label>
          <BooleanSelect label="Worth time" value={draft.worthTime} onChange={(value) => updateDraft("worthTime", value)} />
          <TextField label="Stayed with me score" max="10" min="0" type="number" value={draft.stayedWithMeScore} onChange={(value) => updateDraft("stayedWithMeScore", value)} />
          <BooleanSelect label="Felt alive" value={draft.feltAlive} onChange={(value) => updateDraft("feltAlive", value)} />
          <BooleanSelect label="Felt generic" value={draft.feltGeneric} onChange={(value) => updateDraft("feltGeneric", value)} />
          <TextField label="Completion reason" value={draft.completionReason} onChange={(value) => updateDraft("completionReason", value)} />
          <label className="grid gap-1.5 text-sm font-medium">
            Appetite effect
            <select className={fieldClassName} value={draft.appetiteEffect} onChange={(event) => updateDraft("appetiteEffect", event.target.value)}>
              {AFTERTASTE_APPETITE_EFFECTS.map((effect) => (
                <option key={effect} value={effect}>{appetiteEffectLabels[effect]}</option>
              ))}
            </select>
          </label>
        </div>
        <TextArea label="What worked" value={draft.whatWorked} onChange={(value) => updateDraft("whatWorked", value)} />
        <TextArea label="What failed" value={draft.whatFailed} onChange={(value) => updateDraft("whatFailed", value)} />
        <TextArea label="Final thoughts" value={draft.finalThoughts} onChange={(value) => updateDraft("finalThoughts", value)} />
        {error ? <p className="mt-3 text-sm font-medium text-avoid" role="alert">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={isSaving || mediaItems.length === 0} type="button" onClick={() => void saveEntry()}>
            {isSaving ? "Saving reflection…" : "Save reflection"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function BooleanSelect({ label, value, onChange }: { label: string; value: "true" | "false"; onChange: (value: "true" | "false") => void }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <select className={fieldClassName} value={value} onChange={(event) => onChange(event.target.value as "true" | "false")}>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    </label>
  );
}

function TextField({
  label,
  max,
  min,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  max?: string;
  min?: string;
  type?: "number" | "text";
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <input className={fieldClassName} max={max} min={min} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="mt-4 grid gap-1.5 text-sm font-medium">
      {label}
      <textarea className={textAreaClassName} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function DeleteAftertasteDialog({ entry, onCancel, onConfirm }: { entry: AftertasteEntry | null; onCancel: () => void; onConfirm: () => void }) {
  if (!entry) return null;
  return (
    <div aria-labelledby="delete-aftertaste-title" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm" role="dialog">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h2 className="text-lg font-semibold" id="delete-aftertaste-title">Delete aftertaste entry?</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">This removes the reflection for “{entry.mediaTitle}”. The media item remains in your library.</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button className="bg-avoid text-white hover:bg-avoid/90" type="button" onClick={onConfirm}>Delete</Button>
        </div>
      </div>
    </div>
  );
}

function SuccessMessage({ message }: { message: string }) {
  return <div className="rounded-2xl border border-promising/30 bg-promising/10 p-4 text-sm font-medium text-promising" role="status">{message}</div>;
}

function entryToDraft(entry: AftertasteEntry): AftertasteDraft {
  return {
    mediaItemId: entry.mediaItemId,
    worthTime: entry.worthTime ? "true" : "false",
    stayedWithMeScore: entry.stayedWithMeScore.toString(),
    feltAlive: entry.feltAlive ? "true" : "false",
    feltGeneric: entry.feltGeneric ? "true" : "false",
    completionReason: entry.completionReason,
    whatWorked: entry.whatWorked,
    whatFailed: entry.whatFailed,
    finalThoughts: entry.finalThoughts,
    appetiteEffect: entry.appetiteEffect,
  };
}
