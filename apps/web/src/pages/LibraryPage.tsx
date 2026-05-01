import { CONSUMPTION_STATUSES, MEDIA_TYPES, type ConsumptionStatus, type MediaItem, type MediaType } from "@canonos/contracts";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { APP_ROUTES } from "@/app/routeConstants";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { CommandSearchInput } from "@/components/forms/CommandSearchInput";
import { PageActionBar } from "@/components/layout/PageActionBar";
import { PageSubtitle, PageTitle } from "@/components/layout/PageText";
import { SectionCard } from "@/components/layout/SectionCard";
import { MediaTypeBadge } from "@/components/data-display/MediaTypeBadge";
import { ScoreBadge } from "@/components/data-display/ScoreBadge";
import { StatusPill, type StatusTone } from "@/components/data-display/StatusPill";
import { Button } from "@/components/ui/button";
import { deleteMediaItem, useMediaItems } from "@/features/media/mediaApi";
import { mediaTypeLabels, statusLabels } from "@/features/media/mediaLabels";
import { MediaFormModal } from "@/features/media/MediaFormModal";
import { cn } from "@/lib/utils";

const statusTone: Record<ConsumptionStatus, StatusTone> = {
  planned: "neutral",
  consuming: "active",
  completed: "success",
  paused: "warning",
  dropped: "danger",
};

export function LibraryPage() {
  const [search, setSearch] = useState("");
  const [mediaType, setMediaType] = useState<MediaType | "">("");
  const [status, setStatus] = useState<ConsumptionStatus | "">("");
  const [modalMedia, setModalMedia] = useState<MediaItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { data, error, isLoading, mutate } = useMediaItems({ mediaType, status, search });

  function openAddModal() {
    setModalMedia(null);
    setIsModalOpen(true);
  }

  function openEditModal(media: MediaItem) {
    setModalMedia(media);
    setIsModalOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      await deleteMediaItem(deleteTarget.id);
      setDeleteTarget(null);
      await mutate();
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : "Could not delete media item.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <PageTitle>Library</PageTitle>
        <PageSubtitle>Track the works you plan to consume, are consuming, completed, paused, or dropped.</PageSubtitle>
      </section>

      <SectionCard title="Library controls">
        <PageActionBar className="justify-between">
          <div className="grid w-full gap-3 lg:grid-cols-[minmax(16rem,1fr)_12rem_12rem]">
            <CommandSearchInput value={search} onChange={(event) => setSearch(event.target.value)} />
            <label className="grid gap-1 text-sm font-medium">
              <span className="sr-only">Filter by media type</span>
              <select className={selectClassName} value={mediaType} onChange={(event) => setMediaType(event.target.value as MediaType | "")}>
                <option value="">All media types</option>
                {MEDIA_TYPES.map((type) => <option key={type} value={type}>{mediaTypeLabels[type]}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              <span className="sr-only">Filter by status</span>
              <select className={selectClassName} value={status} onChange={(event) => setStatus(event.target.value as ConsumptionStatus | "")}>
                <option value="">All statuses</option>
                {CONSUMPTION_STATUSES.map((itemStatus) => <option key={itemStatus} value={itemStatus}>{statusLabels[itemStatus]}</option>)}
              </select>
            </label>
          </div>
          <Button className="w-full gap-2 sm:w-auto" type="button" onClick={openAddModal}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add Media
          </Button>
        </PageActionBar>
      </SectionCard>

      {isLoading ? <LoadingState title="Loading library" message="Fetching your private media records." /> : null}
      {error ? <ErrorState title="Library unavailable" message={error.message} onRetry={() => void mutate()} /> : null}
      {deleteError ? <ErrorState title="Delete failed" message={deleteError} /> : null}
      {!isLoading && !error && data?.results.length === 0 ? (
        <EmptyState
          actionLabel="Add Media"
          message="Create the first item in your media memory. Later modules will add scoring, aftertaste, and recommendations on top of this library."
          title="No media items match this view"
          onAction={openAddModal}
        />
      ) : null}
      {!isLoading && !error && data && data.results.length > 0 ? (
        <SectionCard title="Media items" className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <thead className="border-b border-border bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Rating</th>
                  <th className="px-4 py-3 font-semibold">Updated</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.results.map((item) => (
                  <MediaItemRow
                    item={item}
                    key={item.id}
                    onDelete={() => setDeleteTarget(item)}
                    onEdit={() => openEditModal(item)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}

      <MediaFormModal open={isModalOpen} media={modalMedia} onClose={() => setIsModalOpen(false)} onSaved={() => void mutate()} />
      <DeleteDialog item={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={() => void confirmDelete()} />
    </div>
  );
}

function MediaItemRow({ item, onEdit, onDelete }: { item: MediaItem; onEdit: () => void; onDelete: () => void }) {
  return (
    <tr className="bg-card align-top transition hover:bg-muted/40">
      <td className="px-4 py-4">
        <Link className="font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline" to={APP_ROUTES.mediaDetail.replace(":mediaId", item.id)}>
          {item.title}
        </Link>
        <p className="mt-1 text-xs text-muted-foreground">{item.creator || "Creator unknown"}{item.releaseYear ? ` · ${item.releaseYear}` : ""}</p>
      </td>
      <td className="px-4 py-4"><MediaTypeBadge type={item.mediaType} label={mediaTypeLabels[item.mediaType]} /></td>
      <td className="px-4 py-4"><StatusPill label={statusLabels[item.status]} tone={statusTone[item.status]} /></td>
      <td className="px-4 py-4"><ScoreBadge score={item.personalRating ?? undefined} tone={item.personalRating && item.personalRating >= 8 ? "excellent" : "unknown"} /></td>
      <td className="px-4 py-4 text-muted-foreground">{new Date(item.updatedAt).toLocaleDateString()}</td>
      <td className="px-4 py-4">
        <div className="flex justify-end gap-2">
          <Button aria-label={`Edit ${item.title}`} size="sm" type="button" variant="secondary" onClick={onEdit}><Pencil aria-hidden="true" className="h-4 w-4" /></Button>
          <Button aria-label={`Delete ${item.title}`} size="sm" type="button" variant="ghost" onClick={onDelete}><Trash2 aria-hidden="true" className="h-4 w-4" /></Button>
        </div>
      </td>
    </tr>
  );
}

function DeleteDialog({ item, onCancel, onConfirm }: { item: MediaItem | null; onCancel: () => void; onConfirm: () => void }) {
  if (!item) return null;
  return (
    <div aria-labelledby="delete-media-title" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm" role="dialog">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h2 className="text-lg font-semibold" id="delete-media-title">Delete media item?</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">This removes “{item.title}” from your private library.</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button className="bg-avoid text-white hover:bg-avoid/90" type="button" onClick={onConfirm}>Delete</Button>
        </div>
      </div>
    </div>
  );
}

const selectClassName = cn(
  "h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary",
);
