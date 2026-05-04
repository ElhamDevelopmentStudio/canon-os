import { CONSUMPTION_STATUSES, MEDIA_TYPES, type ConsumptionStatus, type MediaItem, type MediaItemFilters, type MediaType } from "@canonos/contracts";
import { SlidersHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { APP_ROUTES } from "@/app/routeConstants";
import { MediaTypeBadge } from "@/components/data-display/MediaTypeBadge";
import { PaginationControls } from "@/components/data-display/PaginationControls";
import { ScoreBadge } from "@/components/data-display/ScoreBadge";
import { StatusPill, type StatusTone } from "@/components/data-display/StatusPill";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { DialogShell } from "@/components/feedback/DialogShell";
import { ListSkeleton } from "@/components/feedback/ListSkeleton";
import { CommandSearchInput } from "@/components/forms/CommandSearchInput";
import { PageActionBar } from "@/components/layout/PageActionBar";
import { PageSubtitle, PageTitle } from "@/components/layout/PageText";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { deleteMediaItem, useMediaItems } from "@/features/media/mediaApi";
import { mediaTypeLabels, statusLabels } from "@/features/media/mediaLabels";
import { MediaFormModal } from "@/features/media/MediaFormModal";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { DEFAULT_PAGE_SIZE, pageFromSearchParams } from "@/lib/pagination";
import { cn } from "@/lib/utils";

const filterLabels: Record<keyof MediaItemFilters, string> = {
  mediaType: "Media type",
  status: "Status",
  search: "Search",
  creator: "Creator",
  ratingMin: "Min rating",
  ratingMax: "Max rating",
  genericnessMin: "Min genericness",
  genericnessMax: "Max genericness",
  regretMin: "Min regret",
  regretMax: "Max regret",
  completedFrom: "Completed after",
  completedTo: "Completed before",
};

const filterKeys = Object.keys(filterLabels) as (keyof MediaItemFilters)[];

const statusTone: Record<ConsumptionStatus, StatusTone> = {
  planned: "neutral",
  consuming: "active",
  completed: "success",
  paused: "warning",
  dropped: "danger",
};

export function LibraryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [modalMedia, setModalMedia] = useState<MediaItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState(searchParams.get("search") ?? "");
  const debouncedSearch = useDebouncedValue(searchDraft);
  const page = pageFromSearchParams(searchParams);
  const filters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);
  const requestFilters = useMemo(
    () => ({ ...filters, page, search: debouncedSearch.trim() }),
    [debouncedSearch, filters, page],
  );
  const activeFilters = useMemo(() => activeFilterEntries({ ...filters, search: searchDraft.trim() }), [filters, searchDraft]);
  const { data, error, isLoading, mutate } = useMediaItems(requestFilters);

  useEffect(() => {
    const currentSearch = searchParams.get("search") ?? "";
    const trimmedSearch = debouncedSearch.trim();
    if (trimmedSearch === currentSearch) return;
    const next = new URLSearchParams(searchParams);
    if (trimmedSearch) next.set("search", trimmedSearch);
    else next.delete("search");
    next.delete("page");
    setSearchParams(next, { replace: true });
  }, [debouncedSearch, searchParams, setSearchParams]);

  function updateFilter(key: keyof MediaItemFilters, value: string) {
    if (key === "search") {
      setSearchDraft(value);
      return;
    }
    const next = new URLSearchParams(searchParams);
    const trimmed = value.trim();
    if (trimmed) next.set(key, trimmed);
    else next.delete(key);
    next.delete("page");
    setSearchParams(next, { replace: true });
  }

  function clearFilters() {
    setSearchDraft("");
    setSearchParams({}, { replace: true });
  }

  function updatePage(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    if (nextPage <= 1) next.delete("page");
    else next.set("page", String(nextPage));
    setSearchParams(next, { replace: true });
  }

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
        <div className="grid gap-4">
          <PageActionBar className="justify-between">
            <div className="grid w-full gap-3 lg:grid-cols-[minmax(16rem,1fr)_12rem_12rem]">
              <CommandSearchInput value={searchDraft} onChange={(event) => updateFilter("search", event.target.value)} />
              <label className="grid gap-1 text-sm font-medium">
                <span className="sr-only">Filter by media type</span>
                <select className={selectClassName} value={filters.mediaType ?? ""} onChange={(event) => updateFilter("mediaType", event.target.value as MediaType | "")}>
                  <option value="">All media types</option>
                  {MEDIA_TYPES.map((type) => <option key={type} value={type}>{mediaTypeLabels[type]}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium">
                <span className="sr-only">Filter by status</span>
                <select className={selectClassName} value={filters.status ?? ""} onChange={(event) => updateFilter("status", event.target.value as ConsumptionStatus | "")}>
                  <option value="">All statuses</option>
                  {CONSUMPTION_STATUSES.map((itemStatus) => <option key={itemStatus} value={itemStatus}>{statusLabels[itemStatus]}</option>)}
                </select>
              </label>
            </div>
            <Button className="w-full gap-2 sm:w-auto" type="button" variant="secondary" onClick={() => setShowAdvancedFilters((current) => !current)}>
              <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
              Advanced filters
            </Button>
            <Button className="w-full gap-2 sm:w-auto" type="button" onClick={openAddModal}>
              <Plus aria-hidden="true" className="h-4 w-4" />
              Add Media
            </Button>
          </PageActionBar>

          {showAdvancedFilters ? <AdvancedFiltersPanel filters={filters} onChange={updateFilter} /> : null}

          {activeFilters.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
              {activeFilters.map(([key, value]) => (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground" key={key}>
                  {filterLabels[key]}: {filterDisplayValue(key, value)}
                  <button className="rounded-full p-0.5 hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary" type="button" aria-label={`Remove ${filterLabels[key]} filter`} onClick={() => updateFilter(key, "")}>
                    <X aria-hidden="true" className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <Button size="sm" type="button" variant="ghost" onClick={clearFilters}>Clear Filters</Button>
            </div>
          ) : null}
        </div>
      </SectionCard>

      {isLoading ? <ListSkeleton label="Loading library" rows={8} /> : null}
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
        <>
          <PaginationControls
            count={data.count}
            itemLabel="media item"
            page={Number(page)}
            pageSize={DEFAULT_PAGE_SIZE}
            onPageChange={updatePage}
          />
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
        </>
      ) : null}

      <MediaFormModal open={isModalOpen} media={modalMedia} onClose={() => setIsModalOpen(false)} onSaved={() => void mutate()} />
      <DeleteDialog item={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={() => void confirmDelete()} />
    </div>
  );
}

function AdvancedFiltersPanel({ filters, onChange }: { filters: MediaItemFilters; onChange: (key: keyof MediaItemFilters, value: string) => void }) {
  return (
    <div className="rounded-2xl border border-border bg-muted/20 p-4" aria-label="Advanced library filters">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <FilterTextInput label="Creator" value={filters.creator ?? ""} onChange={(value) => onChange("creator", value)} />
        <FilterTextInput label="Minimum rating" type="number" value={filters.ratingMin ?? ""} onChange={(value) => onChange("ratingMin", value)} />
        <FilterTextInput label="Maximum rating" type="number" value={filters.ratingMax ?? ""} onChange={(value) => onChange("ratingMax", value)} />
        <FilterTextInput label="Minimum genericness" type="number" value={filters.genericnessMin ?? ""} onChange={(value) => onChange("genericnessMin", value)} />
        <FilterTextInput label="Maximum genericness" type="number" value={filters.genericnessMax ?? ""} onChange={(value) => onChange("genericnessMax", value)} />
        <FilterTextInput label="Minimum regret" type="number" value={filters.regretMin ?? ""} onChange={(value) => onChange("regretMin", value)} />
        <FilterTextInput label="Maximum regret" type="number" value={filters.regretMax ?? ""} onChange={(value) => onChange("regretMax", value)} />
        <FilterTextInput label="Completed after" type="date" value={filters.completedFrom ?? ""} onChange={(value) => onChange("completedFrom", value)} />
        <FilterTextInput label="Completed before" type="date" value={filters.completedTo ?? ""} onChange={(value) => onChange("completedTo", value)} />
      </div>
    </div>
  );
}

function FilterTextInput({ label, onChange, type = "text", value }: { label: string; onChange: (value: string) => void; type?: "date" | "number" | "text"; value: string }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <input
        className={selectClassName}
        max={type === "number" ? 10 : undefined}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? 0.1 : undefined}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
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
    <DialogShell labelledBy="delete-media-title" onClose={onCancel}>
      <h2 className="text-lg font-semibold" id="delete-media-title">Delete media item?</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">This removes “{item.title}” from your private library.</p>
      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button className="bg-avoid text-white hover:bg-avoid/90" type="button" onClick={onConfirm}>Delete</Button>
      </div>
    </DialogShell>
  );
}

function filtersFromSearchParams(searchParams: URLSearchParams): MediaItemFilters {
  const filters: Partial<Record<keyof MediaItemFilters, string>> = {};
  for (const key of filterKeys) {
    const value = searchParams.get(key);
    if (value) filters[key] = value;
  }
  return filters as MediaItemFilters;
}

function activeFilterEntries(filters: MediaItemFilters): [keyof MediaItemFilters, string][] {
  return filterKeys.flatMap((key) => {
    const value = filters[key];
    return typeof value === "string" && value.trim() ? [[key, value] as [keyof MediaItemFilters, string]] : [];
  });
}

function filterDisplayValue(key: keyof MediaItemFilters, value: string): string {
  if (key === "mediaType" && value in mediaTypeLabels) return mediaTypeLabels[value as MediaType];
  if (key === "status" && value in statusLabels) return statusLabels[value as ConsumptionStatus];
  return value;
}

const selectClassName = cn(
  "h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary",
);
