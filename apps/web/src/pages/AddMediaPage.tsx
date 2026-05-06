import {
  CONSUMPTION_STATUSES,
  SCORE_MAX,
  SCORE_MIN,
  type ConsumptionStatus,
  type ExternalMediaMatch,
  type ExternalProvider,
  type MediaItemCreateRequest,
  type MediaType,
  type TasteDimension,
} from "@canonos/contracts";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Clapperboard,
  ExternalLink,
  Headphones,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  Tv,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { APP_ROUTES } from "@/app/routeConstants";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { DialogShell } from "@/components/feedback/DialogShell";
import { FormFieldWrapper, TextInput } from "@/components/forms/FormFieldWrapper";
import { Button } from "@/components/ui/button";
import { createMediaItem } from "@/features/media/mediaApi";
import { mediaTypeLabels, statusLabels } from "@/features/media/mediaLabels";
import {
  findScoreValidationError,
  scoreDraftsToRequest,
  type ScoreDraft,
} from "@/features/media/scoreDrafts";
import { upsertMediaScores, useTasteDimensions } from "@/features/media/tasteApi";
import { attachMetadata, searchMetadata } from "@/features/metadata/metadataApi";
import { externalProviderLabels } from "@/features/metadata/metadataLabels";
import { cn } from "@/lib/utils";

type ScoreDraftMap = Record<string, ScoreDraft>;

type AddFormState = {
  title: string;
  originalTitle: string;
  releaseYear: string;
  countryLanguage: string;
  creator: string;
  status: ConsumptionStatus;
  personalRating: string;
  startedDate: string;
  completedDate: string;
  runtimeMinutes: string;
  episodeCount: string;
  pageCount: string;
  audiobookLengthMinutes: string;
  notes: string;
};

type QueueItem = {
  tempId: string;
  mediaType: MediaType;
  match: ExternalMediaMatch | null;
  form: AddFormState;
  scoreDrafts: ScoreDraftMap;
};

type ProviderDetailRow = {
  label: string;
  value: string;
};

const providerByType: Record<MediaType, ExternalProvider | ""> = {
  movie: "movie_tv",
  tv_show: "movie_tv",
  anime: "anime",
  novel: "book",
  audiobook: "audiobook",
};

const categoryOptions: Array<{
  type: MediaType;
  icon: typeof Clapperboard;
  hint: string;
}> = [
  { type: "movie", icon: Clapperboard, hint: "Films and documentaries" },
  { type: "tv_show", icon: Tv, hint: "Series and miniseries" },
  { type: "anime", icon: Sparkles, hint: "Anime and OVAs" },
  { type: "novel", icon: BookOpen, hint: "Books and written works" },
  { type: "audiobook", icon: Headphones, hint: "Audio editions" },
];

const emptyForm: AddFormState = {
  title: "",
  originalTitle: "",
  releaseYear: "",
  countryLanguage: "",
  creator: "",
  status: "planned",
  personalRating: "",
  startedDate: "",
  completedDate: "",
  runtimeMinutes: "",
  episodeCount: "",
  pageCount: "",
  audiobookLengthMinutes: "",
  notes: "",
};

function isMediaType(value: string | null): value is MediaType {
  return categoryOptions.some((option) => option.type === value);
}

function isProvider(value: string | null): value is ExternalProvider {
  return ["manual", "movie_tv", "anime", "book", "audiobook"].includes(value ?? "");
}

function nullableNumber(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

function nullableDate(value: string): string | null {
  return value.trim() === "" ? null : value;
}

function valueFromPayload(payload: Record<string, unknown>, key: string): unknown {
  const raw = payload.raw && typeof payload.raw === "object" ? payload.raw as Record<string, unknown> : {};
  return payload[key] ?? raw[key];
}

function textFromValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not provided";
  if (Array.isArray(value)) return value.map(textFromValue).filter((item) => item !== "Not provided").join(", ") || "Not provided";
  if (typeof value === "object") return "Available from provider";
  return String(value);
}

function providerDetailsFor(match: ExternalMediaMatch): ProviderDetailRow[] {
  const payload = match.rawPayload ?? {};
  const rows: ProviderDetailRow[] = [
    { label: "Provider", value: externalProviderLabels[match.provider] },
    { label: "Provider ID", value: match.providerItemId },
    { label: "Source", value: textFromValue(valueFromPayload(payload, "sourceProvider")) },
    { label: "Source media type", value: textFromValue(valueFromPayload(payload, "sourceMediaType")) },
    { label: "TMDb ID", value: textFromValue(valueFromPayload(payload, "tmdbId")) },
    { label: "IMDb ID", value: textFromValue(valueFromPayload(payload, "imdbId")) },
    { label: "AniList ID", value: textFromValue(valueFromPayload(payload, "anilistId")) },
    { label: "ISBN", value: textFromValue(valueFromPayload(payload, "isbn")) },
    { label: "Release date", value: textFromValue(valueFromPayload(payload, "release_date")) },
    { label: "Original language", value: textFromValue(valueFromPayload(payload, "original_language")) },
    { label: "Genres", value: textFromValue(valueFromPayload(payload, "genres")) },
    { label: "Vote count", value: textFromValue(valueFromPayload(payload, "vote_count")) },
  ];
  return rows.filter((row) => row.value !== "Not provided").slice(0, 8);
}

function formFromMatch(match: ExternalMediaMatch): AddFormState {
  return {
    ...emptyForm,
    title: match.title,
    originalTitle: match.originalTitle,
    releaseYear: match.releaseYear?.toString() ?? "",
    creator: match.creator,
    personalRating: match.externalRating?.toString() ?? "",
    notes: match.description,
  };
}

function createRequestFromQueueItem(item: QueueItem): MediaItemCreateRequest {
  return {
    title: item.form.title.trim(),
    originalTitle: item.form.originalTitle.trim(),
    mediaType: item.mediaType,
    releaseYear: nullableNumber(item.form.releaseYear),
    countryLanguage: item.form.countryLanguage.trim(),
    creator: item.form.creator.trim(),
    status: item.form.status,
    personalRating: nullableNumber(item.form.personalRating),
    startedDate: nullableDate(item.form.startedDate),
    completedDate: nullableDate(item.form.completedDate),
    runtimeMinutes: nullableNumber(item.form.runtimeMinutes),
    episodeCount: nullableNumber(item.form.episodeCount),
    pageCount: nullableNumber(item.form.pageCount),
    audiobookLengthMinutes: nullableNumber(item.form.audiobookLengthMinutes),
    notes: item.form.notes.trim(),
  };
}

function newQueueItem(mediaType: MediaType, match: ExternalMediaMatch | null): QueueItem {
  return {
    tempId: `${mediaType}-${match?.providerItemId ?? "manual"}-${crypto.randomUUID()}`,
    mediaType,
    match,
    form: match ? formFromMatch(match) : { ...emptyForm, status: "planned" },
    scoreDrafts: {},
  };
}

export function AddMediaPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedMediaType = searchParams.get("type");
  const requestedProvider = searchParams.get("provider");
  const initialMediaType: MediaType = isMediaType(requestedMediaType) ? requestedMediaType : "movie";
  const initialProvider: ExternalProvider | "" = isProvider(requestedProvider) ? requestedProvider : providerByType[initialMediaType];
  const [mediaType, setMediaType] = useState<MediaType>(initialMediaType);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [provider, setProvider] = useState<ExternalProvider | "">(initialProvider);
  const [matches, setMatches] = useState<ExternalMediaMatch[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [detailsMatch, setDetailsMatch] = useState<ExternalMediaMatch | null>(null);
  const [configItemId, setConfigItemId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { data: dimensions, error: dimensionsError, isLoading: isLoadingDimensions } = useTasteDimensions(true);

  const queuedProviderIds = useMemo(
    () => new Set(queue.flatMap((item) => (item.match?.providerItemId ? [item.match.providerItemId] : []))),
    [queue],
  );
  const configItem = queue.find((item) => item.tempId === configItemId) ?? null;

  function syncUrl(next: { query?: string; mediaType?: MediaType; provider?: ExternalProvider | "" }) {
    const params = new URLSearchParams(searchParams);
    const nextQuery = next.query ?? query;
    const nextMediaType = next.mediaType ?? mediaType;
    const nextProvider = next.provider ?? provider;
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    else params.delete("q");
    params.set("type", nextMediaType);
    if (nextProvider) params.set("provider", nextProvider);
    else params.delete("provider");
    setSearchParams(params, { replace: true });
  }

  function changeMediaType(nextType: MediaType) {
    const nextProvider = providerByType[nextType];
    setMediaType(nextType);
    setProvider(nextProvider);
    setMatches([]);
    setSearchError(null);
    setQueue([]);
    setQuery("");
    setManualTitle("");
    syncUrl({ query: "", mediaType: nextType, provider: nextProvider });
  }

  function changeQuery(nextQuery: string) {
    setQuery(nextQuery);
    syncUrl({ query: nextQuery });
  }

  function changeProvider(nextProvider: ExternalProvider | "") {
    setProvider(nextProvider);
    syncUrl({ provider: nextProvider });
  }

  async function handleSearch(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const trimmedQuery = query.trim();
    syncUrl({});
    if (!trimmedQuery) {
      setSearchError("Enter a title to search.");
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    try {
      const response = await searchMetadata({ query: trimmedQuery, mediaType, provider });
      setMatches(response.results.filter((match) => match.mediaType === mediaType));
    } catch (caught) {
      setSearchError(caught instanceof Error ? caught.message : "Could not search metadata providers.");
    } finally {
      setIsSearching(false);
    }
  }

  function addMatch(match: ExternalMediaMatch) {
    setQueue((current) => {
      if (current.some((item) => item.match?.providerItemId === match.providerItemId)) return current;
      return [...current, newQueueItem(mediaType, match)];
    });
  }

  function addManualItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = manualTitle.trim();
    if (!title) return;
    setQueue((current) => [
      ...current,
      { ...newQueueItem(mediaType, null), form: { ...emptyForm, title, status: "planned" } },
    ]);
    setManualTitle("");
    setManualOpen(false);
  }

  function updateQueueItem(tempId: string, patch: Partial<QueueItem>) {
    setQueue((current) => current.map((item) => (item.tempId === tempId ? { ...item, ...patch } : item)));
  }

  function removeQueueItem(tempId: string) {
    setQueue((current) => current.filter((item) => item.tempId !== tempId));
    setOpenMenuId(null);
    if (configItemId === tempId) setConfigItemId(null);
  }

  async function saveQueue() {
    if (!queue.length) {
      setSaveError("Add at least one title before saving.");
      return;
    }
    const invalidTitle = queue.find((item) => !item.form.title.trim());
    if (invalidTitle) {
      setSaveError("Every queued item needs a title.");
      return;
    }
    const scoreError = dimensions
      ? queue.map((item) => findScoreValidationError(dimensions, item.scoreDrafts)).find(Boolean)
      : null;
    if (scoreError) {
      setSaveError(scoreError);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      await Promise.all(queue.map(async (item) => {
        const saved = await createMediaItem(createRequestFromQueueItem(item));
        if (item.match) await attachMetadata(saved.id, item.match);
        if (dimensions?.length) {
          await upsertMediaScores(saved.id, { scores: scoreDraftsToRequest(dimensions, item.scoreDrafts) });
        }
      }));
      navigate(APP_ROUTES.library);
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : "Could not save the selected titles.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
      <header className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <Link className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground" to={APP_ROUTES.library}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Library
          </Link>
          <div className="mt-8 max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-tight">Add media</h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Pick one library category, search public providers, inspect the match, then save several titles at once.
            </p>
          </div>
        </div>
        <div className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground">
          Batch category <span className="font-semibold text-foreground">{mediaTypeLabels[mediaType]}</span>
        </div>
      </header>

      <section aria-label="Choose what you are adding" className="border-y border-border py-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
          {categoryOptions.map((option) => (
            <CategorySegment
              isActive={mediaType === option.type}
              key={option.type}
              option={option}
              onClick={() => changeMediaType(option.type)}
            />
          ))}
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <main className="grid gap-6">
          <section aria-label="Search public metadata" className="border-b border-border pb-6">
            <form className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_14rem_auto]" onSubmit={handleSearch}>
              <FormFieldWrapper id="provider-title-search" label={`${mediaTypeLabels[mediaType]} title`}>
                <TextInput
                  id="provider-title-search"
                  placeholder="Search by title"
                  value={query}
                  onChange={(event) => changeQuery(event.target.value)}
                />
              </FormFieldWrapper>
              <FormFieldWrapper id="provider-source" label="Provider">
                <select
                  className={selectClassName}
                  id="provider-source"
                  value={provider}
                  onChange={(event) => changeProvider(event.target.value as ExternalProvider | "")}
                >
                  <option value="">Best available</option>
                  <option value={providerByType[mediaType]}>{externalProviderLabels[providerByType[mediaType] || "manual"]}</option>
                </select>
              </FormFieldWrapper>
              <div className="flex items-end">
                <Button className="w-full gap-2" disabled={isSearching} type="submit">
                  <Search aria-hidden="true" className="h-4 w-4" />
                  {isSearching ? "Searching..." : "Search"}
                </Button>
              </div>
            </form>
            {searchError ? <div className="mt-4"><ErrorState title="Search failed" message={searchError} /></div> : null}
          </section>

          <section aria-label="Provider results" className="min-h-80">
            {isSearching ? <LoadingState title="Searching providers" message="Looking up public metadata without sending private notes or ratings." /> : null}
            {!isSearching && matches.length ? (
              <div className="grid gap-1">
                {matches.map((match) => (
                  <ResultRow
                    isQueued={queuedProviderIds.has(match.providerItemId)}
                    key={`${match.provider}:${match.providerItemId}`}
                    match={match}
                    onAdd={() => addMatch(match)}
                    onDetails={() => setDetailsMatch(match)}
                  />
                ))}
              </div>
            ) : null}
            {!isSearching && !matches.length ? (
              <div className="border-y border-dashed border-border py-16 text-center">
                <h2 className="text-xl font-semibold">Search for titles</h2>
                <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
                  Results appear as scan-friendly rows. Open any title for source details before adding it.
                </p>
              </div>
            ) : null}
          </section>

          <section aria-label="Advanced options" className="border-t border-border pt-4">
            <button
              className="flex w-full items-center justify-between py-3 text-left text-sm font-semibold text-foreground transition hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              type="button"
              onClick={() => setManualOpen((current) => !current)}
            >
              Manual entry for a missing {mediaTypeLabels[mediaType].toLowerCase()}
              <span className="text-muted-foreground">{manualOpen ? "Close" : "Open"}</span>
            </button>
            {manualOpen ? (
              <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={addManualItem}>
                <FormFieldWrapper id="manual-title" label="Title">
                  <TextInput id="manual-title" value={manualTitle} onChange={(event) => setManualTitle(event.target.value)} />
                </FormFieldWrapper>
                <div className="flex items-end">
                  <Button className="w-full gap-2" type="submit" variant="secondary">
                    <Plus aria-hidden="true" className="h-4 w-4" />
                    Add manually
                  </Button>
                </div>
              </form>
            ) : null}
          </section>
        </main>

        <aside aria-label={`Selected ${mediaTypeLabels[mediaType].toLowerCase()} titles`} className="xl:sticky xl:top-6 xl:self-start">
          <div className="border-l border-border pl-6 max-xl:border-l-0 max-xl:border-t max-xl:pl-0 max-xl:pt-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">Selected titles</h2>
              <span className="text-sm text-muted-foreground">{queue.length}</span>
            </div>
            {saveError ? <div className="mt-4"><ErrorState title="Save failed" message={saveError} /></div> : null}
            <div className="mt-4 grid gap-2">
              {queue.length ? (
                queue.map((item) => (
                  <QueuedItemRow
                    item={item}
                    key={item.tempId}
                    menuOpen={openMenuId === item.tempId}
                    onConfigure={() => {
                      setConfigItemId(item.tempId);
                      setOpenMenuId(null);
                    }}
                    onMenuToggle={() => setOpenMenuId((current) => (current === item.tempId ? null : item.tempId))}
                    onRemove={() => removeQueueItem(item.tempId)}
                    onViewDetails={() => {
                      if (item.match) setDetailsMatch(item.match);
                      setOpenMenuId(null);
                    }}
                  />
                ))
              ) : (
                <p className="border-y border-dashed border-border py-8 text-sm leading-6 text-muted-foreground">
                  Add provider matches or use manual entry. Your selected titles stay here until saved.
                </p>
              )}
            </div>
            <Button className="mt-5 w-full" disabled={isSaving || !queue.length} type="button" onClick={() => void saveQueue()}>
              {isSaving ? "Saving titles..." : `Save ${queue.length || ""} ${queue.length === 1 ? "title" : "titles"}`}
            </Button>
          </div>
        </aside>
      </div>

      <ResultDetailsModal match={detailsMatch} onAdd={addMatch} onClose={() => setDetailsMatch(null)} queuedProviderIds={queuedProviderIds} />
      <ItemConfigModal
        dimensions={dimensions}
        dimensionsError={dimensionsError}
        isLoadingDimensions={isLoadingDimensions}
        item={configItem}
        onClose={() => setConfigItemId(null)}
        onSave={(updated) => {
          updateQueueItem(updated.tempId, updated);
          setConfigItemId(null);
        }}
      />
    </div>
  );
}

function CategorySegment({
  option,
  isActive,
  onClick,
}: {
  option: (typeof categoryOptions)[number];
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = option.icon;
  return (
    <button
      className={cn(
        "flex min-h-20 items-start gap-3 border-l px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-primary",
        isActive ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground",
      )}
      type="button"
      onClick={onClick}
    >
      <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
      <span>
        <span className="block font-semibold">{mediaTypeLabels[option.type]}</span>
        <span className="mt-1 block text-sm leading-5">{option.hint}</span>
      </span>
    </button>
  );
}

function ResultRow({
  match,
  isQueued,
  onAdd,
  onDetails,
}: {
  match: ExternalMediaMatch;
  isQueued: boolean;
  onAdd: () => void;
  onDetails: () => void;
}) {
  return (
    <article className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-4 border-b border-border py-4 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto] sm:items-center">
      <button className="justify-self-start text-left focus:outline-none focus:ring-2 focus:ring-primary" type="button" onClick={onDetails}>
        {match.imageUrl ? (
          <img alt={`Poster for ${match.title}`} className="h-24 w-16 rounded-md object-cover" src={match.imageUrl} />
        ) : (
          <span className="flex h-24 w-16 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">No image</span>
        )}
      </button>
      <button className="min-w-0 text-left focus:outline-none focus:ring-2 focus:ring-primary" type="button" onClick={onDetails}>
        <p className="text-xs font-semibold uppercase text-muted-foreground">
          {externalProviderLabels[match.provider]} · {Math.round(match.confidence * 100)}% confidence
        </p>
        <h3 className="mt-1 text-lg font-semibold text-foreground">{match.title}</h3>
        <p className="text-sm text-muted-foreground">{[match.creator, match.releaseYear].filter(Boolean).join(" · ") || "Creator/year unknown"}</p>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{match.description || "No description supplied by this provider."}</p>
      </button>
      <Button className="col-span-2 gap-2 sm:col-span-1 sm:justify-self-end" disabled={isQueued} size="sm" type="button" variant={isQueued ? "secondary" : "default"} onClick={onAdd}>
        {isQueued ? <Check aria-hidden="true" className="h-4 w-4" /> : <Plus aria-hidden="true" className="h-4 w-4" />}
        {isQueued ? "Selected" : "Add"}
      </Button>
    </article>
  );
}

function QueuedItemRow({
  item,
  menuOpen,
  onConfigure,
  onMenuToggle,
  onRemove,
  onViewDetails,
}: {
  item: QueueItem;
  menuOpen: boolean;
  onConfigure: () => void;
  onMenuToggle: () => void;
  onRemove: () => void;
  onViewDetails: () => void;
}) {
  return (
    <article className="relative border-b border-border py-3">
      <div className="flex items-start gap-3">
        {item.match?.imageUrl ? (
          <img alt="" className="h-14 w-10 rounded object-cover" src={item.match.imageUrl} />
        ) : (
          <div className="flex h-14 w-10 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">Manual</div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">{item.form.title || "Untitled"}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{statusLabels[item.form.status]}{item.form.personalRating ? ` · ${Number(item.form.personalRating).toFixed(1)}/10` : ""}</p>
        </div>
        <Button aria-label={`Actions for ${item.form.title || "queued title"}`} size="sm" type="button" variant="ghost" onClick={onMenuToggle}>
          <MoreHorizontal aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>
      {menuOpen ? (
        <div className="absolute right-0 top-12 z-10 grid min-w-44 gap-1 rounded-xl border border-border bg-card p-2 shadow-xl">
          {item.match ? <MenuButton label="View details" onClick={onViewDetails} /> : null}
          <MenuButton icon={Settings2} label="Configure" onClick={onConfigure} />
          <MenuButton icon={Trash2} label="Remove" tone="danger" onClick={onRemove} />
        </div>
      ) : null}
    </article>
  );
}

function MenuButton({ icon: Icon, label, tone, onClick }: { icon?: typeof Settings2; label: string; tone?: "danger"; onClick: () => void }) {
  return (
    <button
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary",
        tone === "danger" ? "text-avoid" : "text-foreground",
      )}
      type="button"
      onClick={onClick}
    >
      {Icon ? <Icon aria-hidden="true" className="h-4 w-4" /> : null}
      {label}
    </button>
  );
}

function ResultDetailsModal({
  match,
  queuedProviderIds,
  onAdd,
  onClose,
}: {
  match: ExternalMediaMatch | null;
  queuedProviderIds: Set<string>;
  onAdd: (match: ExternalMediaMatch) => void;
  onClose: () => void;
}) {
  if (!match) return null;
  const isQueued = queuedProviderIds.has(match.providerItemId);
  const detailRows = providerDetailsFor(match);
  return (
    <DialogShell
      className="block overflow-y-auto"
      labelledBy="metadata-details-title"
      onClose={onClose}
      panelClassName="mx-auto my-8 h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] w-full max-w-5xl overflow-hidden rounded-xl p-0"
    >
      <div className="grid h-full min-h-0 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="relative min-h-0 bg-muted">
          {match.imageUrl ? (
            <img alt={`Poster for ${match.title}`} className="h-full min-h-80 w-full object-cover" src={match.imageUrl} />
          ) : (
            <div className="flex h-full min-h-80 items-center justify-center text-sm text-muted-foreground">No image</div>
          )}
        </div>
        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-border p-6">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{externalProviderLabels[match.provider]}</p>
              <h2 className="mt-2 break-words text-3xl font-semibold" id="metadata-details-title">{match.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{[match.creator, match.releaseYear].filter(Boolean).join(" · ") || "Creator/year unknown"}</p>
            </div>
            <Button aria-label="Close result details" size="sm" type="button" variant="ghost" onClick={onClose}>
              <X aria-hidden="true" className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid min-h-0 gap-6 overflow-y-auto p-6">
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground">{match.description || "No description supplied by this provider."}</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Metric label="Rating" value={match.externalRating === null ? "Unknown" : `${match.externalRating}/10`} />
              <Metric label="Popularity" value={match.externalPopularity === null ? "Unknown" : String(match.externalPopularity)} />
              <Metric label="Confidence" value={`${Math.round(match.confidence * 100)}%`} />
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Provider facts</h3>
              {detailRows.length ? (
                <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                  {detailRows.map((row) => (
                    <div className="border-t border-border pt-3" key={row.label}>
                      <dt className="text-muted-foreground">{row.label}</dt>
                      <dd className="mt-1 font-medium text-foreground">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No additional provider facts were supplied.</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button className="gap-2" disabled={isQueued} type="button" onClick={() => onAdd(match)}>
                {isQueued ? <Check aria-hidden="true" className="h-4 w-4" /> : <Plus aria-hidden="true" className="h-4 w-4" />}
                {isQueued ? "Already selected" : "Add this title"}
              </Button>
              {match.sourceUrl ? (
                <Button asChild variant="ghost">
                  <a className="gap-2" href={match.sourceUrl} rel="noreferrer" target="_blank">
                    <ExternalLink aria-hidden="true" className="h-4 w-4" />
                    Open source
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}

function ItemConfigModal({
  item,
  dimensions,
  dimensionsError,
  isLoadingDimensions,
  onClose,
  onSave,
}: {
  item: QueueItem | null;
  dimensions: TasteDimension[] | undefined;
  dimensionsError?: Error;
  isLoadingDimensions?: boolean;
  onClose: () => void;
  onSave: (item: QueueItem) => void;
}) {
  const [draft, setDraft] = useState<QueueItem | null>(item);
  const [activePanel, setActivePanel] = useState<"signals" | "details" | "scores">("signals");

  useEffect(() => {
    setDraft(item);
    setActivePanel("signals");
  }, [item]);

  if (!item || !draft) return null;

  function updateForm<K extends keyof AddFormState>(key: K, value: AddFormState[K]) {
    setDraft((current) => current ? { ...current, form: { ...current.form, [key]: value } } : current);
  }

  return (
    <DialogShell
      className="block overflow-y-auto"
      labelledBy="item-config-title"
      onClose={onClose}
      panelClassName="mx-auto my-8 h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] w-full max-w-5xl overflow-hidden rounded-xl p-0"
    >
      <div className="grid h-full min-h-0 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="min-h-0 overflow-y-auto border-b border-border bg-muted/30 p-6 lg:border-b-0 lg:border-r">
          {draft.match?.imageUrl ? (
            <img alt="" className="h-56 w-40 rounded-xl object-cover shadow-sm" src={draft.match.imageUrl} />
          ) : (
            <div className="flex h-56 w-40 items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">Manual</div>
          )}
          <h2 className="mt-5 break-words text-xl font-semibold" id="item-config-title">{draft.form.title || "Untitled"}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{mediaTypeLabels[draft.mediaType]} · {statusLabels[draft.form.status]}</p>
          <div className="mt-6 grid gap-2">
            <ConfigTab active={activePanel === "signals"} label="Signals" onClick={() => setActivePanel("signals")} />
            <ConfigTab active={activePanel === "details"} label="Details" onClick={() => setActivePanel("details")} />
            <ConfigTab active={activePanel === "scores"} label="Taste scores" onClick={() => setActivePanel("scores")} />
          </div>
        </aside>
        <div className="flex min-h-0 flex-col">
          <header className="flex items-center justify-between gap-4 border-b border-border p-6">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Configure before saving</p>
              <h3 className="mt-1 text-2xl font-semibold">{panelTitle(activePanel)}</h3>
            </div>
            <Button aria-label="Close configuration" size="sm" type="button" variant="ghost" onClick={onClose}>
              <X aria-hidden="true" className="h-4 w-4" />
            </Button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {activePanel === "signals" ? (
              <div className="grid gap-6">
                <StatusPicker value={draft.form.status} onChange={(value) => updateForm("status", value)} />
                <RatingControl value={draft.form.personalRating} onChange={(value) => updateForm("personalRating", value)} />
                <FormFieldWrapper id="config-notes" label="Private notes">
                  <textarea
                    className="min-h-32 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
                    id="config-notes"
                    value={draft.form.notes}
                    onChange={(event) => updateForm("notes", event.target.value)}
                  />
                </FormFieldWrapper>
              </div>
            ) : null}

            {activePanel === "details" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <FormFieldWrapper id="config-title" label="Title">
                  <TextInput id="config-title" required value={draft.form.title} onChange={(event) => updateForm("title", event.target.value)} />
                </FormFieldWrapper>
                <FormFieldWrapper id="config-original-title" label="Original title">
                  <TextInput id="config-original-title" value={draft.form.originalTitle} onChange={(event) => updateForm("originalTitle", event.target.value)} />
                </FormFieldWrapper>
                <FormFieldWrapper id="config-year" label="Release year">
                  <TextInput id="config-year" inputMode="numeric" type="number" value={draft.form.releaseYear} onChange={(event) => updateForm("releaseYear", event.target.value)} />
                </FormFieldWrapper>
                <FormFieldWrapper id="config-creator" label="Creator / director / author">
                  <TextInput id="config-creator" value={draft.form.creator} onChange={(event) => updateForm("creator", event.target.value)} />
                </FormFieldWrapper>
                <FormFieldWrapper id="config-country-language" label="Country / language">
                  <TextInput id="config-country-language" value={draft.form.countryLanguage} onChange={(event) => updateForm("countryLanguage", event.target.value)} />
                </FormFieldWrapper>
              </div>
            ) : null}

            {activePanel === "scores" ? (
              <CompactScoreEditor
                dimensions={dimensions}
                drafts={draft.scoreDrafts}
                error={dimensionsError}
                isLoading={isLoadingDimensions}
                onChange={(scoreDrafts) => setDraft((current) => current ? { ...current, scoreDrafts } : current)}
              />
            ) : null}
          </div>
          <footer className="flex justify-end gap-3 border-t border-border p-4">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="button" onClick={() => onSave(draft)}>Apply</Button>
          </footer>
        </div>
      </div>
    </DialogShell>
  );
}

function ConfigTab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      className={cn(
        "rounded-lg px-3 py-2 text-left text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-background hover:text-foreground",
      )}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function panelTitle(panel: "signals" | "details" | "scores") {
  if (panel === "details") return "Title details";
  if (panel === "scores") return "Taste scorecard";
  return "Personal signals";
}

function StatusPicker({ value, onChange }: { value: ConsumptionStatus; onChange: (value: ConsumptionStatus) => void }) {
  return (
    <section>
      <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Status</h4>
      <div className="mt-3 flex flex-wrap gap-2">
        {CONSUMPTION_STATUSES.map((status) => (
          <button
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary",
              value === status ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted",
            )}
            key={status}
            type="button"
            onClick={() => onChange(status)}
          >
            {statusLabels[status]}
          </button>
        ))}
      </div>
    </section>
  );
}

function RatingControl({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const numericValue = value.trim() ? Number(value) : 0;
  const presets = [
    { label: "Skip", emoji: "⏸", value: "" },
    { label: "Avoid", emoji: "😬", value: "2" },
    { label: "Fine", emoji: "🙂", value: "6" },
    { label: "Strong", emoji: "😍", value: "8.5" },
    { label: "Canon", emoji: "🏆", value: "10" },
  ];
  return (
    <section>
      <div className="flex items-end justify-between gap-3">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Personal rating</h4>
        <span className="text-3xl font-semibold text-foreground">{value.trim() ? Number(value).toFixed(1) : "—"}</span>
      </div>
      <input
        aria-label="Personal rating slider"
        className="mt-4 w-full accent-primary"
        max={SCORE_MAX}
        min={SCORE_MIN}
        step="0.1"
        type="range"
        value={numericValue}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="mt-4 flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-semibold transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary",
              value === preset.value ? "border-primary bg-primary/10 text-primary" : "border-border",
            )}
            key={preset.label}
            type="button"
            onClick={() => onChange(preset.value)}
          >
            <span aria-hidden="true" className="mr-2">{preset.emoji}</span>
            {preset.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function CompactScoreEditor({
  dimensions,
  drafts,
  isLoading,
  error,
  onChange,
}: {
  dimensions: TasteDimension[] | undefined;
  drafts: ScoreDraftMap;
  isLoading?: boolean;
  error?: Error;
  onChange: (drafts: ScoreDraftMap) => void;
}) {
  if (isLoading) return <LoadingState title="Loading taste dimensions" message="Preparing compact score controls." />;
  if (error) return <ErrorState title="Taste dimensions unavailable" message={error.message} />;
  if (!dimensions?.length) return <EmptyState title="No taste dimensions yet" message="Default dimensions will be created when the API is available." />;

  function updateDraft(dimensionId: string, patch: Partial<ScoreDraft>) {
    onChange({
      ...drafts,
      [dimensionId]: {
        dimensionId,
        score: drafts[dimensionId]?.score ?? "",
        note: drafts[dimensionId]?.note ?? "",
        ...patch,
      },
    });
  }

  return (
    <div className="grid gap-4">
      {dimensions.map((dimension) => {
        const draft = drafts[dimension.id] ?? { dimensionId: dimension.id, score: "", note: "" };
        const score = draft.score.trim() ? Number(draft.score) : 0;
        return (
          <section className="border-b border-border pb-4" key={dimension.id}>
            <div className="grid gap-3 md:grid-cols-[12rem_minmax(0,1fr)_4rem] md:items-center">
              <div>
                <h4 className="font-semibold">{dimension.name}</h4>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{dimension.description}</p>
              </div>
              <input
                aria-label={`${dimension.name} score slider`}
                className="w-full accent-primary"
                max={SCORE_MAX}
                min={SCORE_MIN}
                step="0.1"
                type="range"
                value={score}
                onChange={(event) => updateDraft(dimension.id, { score: event.target.value })}
              />
              <input
                aria-label={`${dimension.name} numeric score`}
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary"
                max={SCORE_MAX}
                min={SCORE_MIN}
                type="number"
                value={draft.score}
                onChange={(event) => updateDraft(dimension.id, { score: event.target.value })}
              />
            </div>
            <input
              aria-label={`${dimension.name} score note`}
              className="mt-3 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
              placeholder="Optional score note"
              value={draft.note}
              onChange={(event) => updateDraft(dimension.id, { note: event.target.value })}
            />
          </section>
        );
      })}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-border pt-3">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

const selectClassName = cn(
  "h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary",
);
