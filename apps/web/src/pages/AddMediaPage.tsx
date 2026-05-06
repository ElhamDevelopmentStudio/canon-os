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
  Headphones,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  Tv,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { APP_ROUTES } from "@/app/routeConstants";
import { MediaTypeBadge } from "@/components/data-display/MediaTypeBadge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { DialogShell } from "@/components/feedback/DialogShell";
import { FormFieldWrapper, TextInput } from "@/components/forms/FormFieldWrapper";
import { PageSubtitle, PageTitle } from "@/components/layout/PageText";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { DimensionScoreGrid } from "@/features/media/DimensionScoreGrid";
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

const providerByType: Record<MediaType, ExternalProvider | ""> = {
  movie: "movie_tv",
  tv_show: "movie_tv",
  anime: "anime",
  novel: "book",
  audiobook: "audiobook",
};

const categoryCards: Array<{
  type: MediaType;
  icon: typeof Clapperboard;
  description: string;
}> = [
  { type: "movie", icon: Clapperboard, description: "Films, shorts, documentaries, and feature-length releases." },
  { type: "tv_show", icon: Tv, description: "Series, seasons, miniseries, and episodic television." },
  { type: "anime", icon: Sparkles, description: "Anime series, films, OVAs, and manga-adjacent watch records." },
  { type: "novel", icon: BookOpen, description: "Novels, light novels, nonfiction books, and written works." },
  { type: "audiobook", icon: Headphones, description: "Audiobook editions and long-form audio reads." },
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

function nullableNumber(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

function nullableDate(value: string): string | null {
  return value.trim() === "" ? null : value;
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
  const [mediaType, setMediaType] = useState<MediaType>("movie");
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState<ExternalProvider | "">(providerByType.movie);
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

  function changeMediaType(nextType: MediaType) {
    setMediaType(nextType);
    setProvider(providerByType[nextType]);
    setMatches([]);
    setSearchError(null);
    setQueue([]);
    setQuery("");
    setManualTitle("");
  }

  async function handleSearch(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const trimmedQuery = query.trim();
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
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Button asChild className="mb-4 gap-2" variant="ghost">
            <Link to={APP_ROUTES.library}>
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              Library
            </Link>
          </Button>
          <PageTitle>Add media</PageTitle>
          <PageSubtitle>Choose one category, search providers, inspect details, then add several titles in one pass.</PageSubtitle>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Batch category: <span className="font-semibold text-foreground">{mediaTypeLabels[mediaType]}</span>
        </div>
      </section>

      <SectionCard title="Choose what you are adding">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {categoryCards.map((card) => (
            <CategoryButton
              card={card}
              isActive={mediaType === card.type}
              key={card.type}
              onClick={() => changeMediaType(card.type)}
            />
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <main className="grid gap-6">
          <SectionCard title="Search public metadata">
            <form className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_14rem_auto]" onSubmit={handleSearch}>
              <FormFieldWrapper id="provider-title-search" label={`${mediaTypeLabels[mediaType]} title`}>
                <TextInput
                  id="provider-title-search"
                  placeholder="Search by title"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </FormFieldWrapper>
              <FormFieldWrapper id="provider-source" label="Provider">
                <select
                  className={selectClassName}
                  id="provider-source"
                  value={provider}
                  onChange={(event) => setProvider(event.target.value as ExternalProvider | "")}
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
          </SectionCard>

          <section className="grid gap-3">
            {isSearching ? <LoadingState title="Searching providers" message="Looking up public metadata without sending private notes or ratings." /> : null}
            {!isSearching && matches.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {matches.map((match) => (
                  <ResultCard
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
              <EmptyState
                title="Search for titles"
                message="Results will appear here as compact cards. Open a card to inspect the full metadata before adding it."
              />
            ) : null}
          </section>

          <SectionCard title="Advanced options">
            <button
              className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-left text-sm font-semibold transition hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary"
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
          </SectionCard>
        </main>

        <aside className="grid content-start gap-4">
          <SectionCard title={`Selected ${mediaTypeLabels[mediaType].toLowerCase()} titles`}>
            {saveError ? <ErrorState title="Save failed" message={saveError} /> : null}
            {queue.length ? (
              <div className="grid gap-3">
                {queue.map((item) => (
                  <QueuedItemCard
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
                ))}
              </div>
            ) : (
              <EmptyState title="Nothing selected yet" message="Add one or more results, or use manual entry if a provider cannot find the title." />
            )}
            <Button className="mt-4 w-full" disabled={isSaving || !queue.length} type="button" onClick={() => void saveQueue()}>
              {isSaving ? "Saving titles..." : `Save ${queue.length || ""} ${queue.length === 1 ? "title" : "titles"}`}
            </Button>
          </SectionCard>
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

function CategoryButton({
  card,
  isActive,
  onClick,
}: {
  card: (typeof categoryCards)[number];
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = card.icon;
  return (
    <button
      className={cn(
        "grid min-h-40 gap-3 rounded-xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-primary",
        isActive ? "border-primary bg-primary/10 shadow-sm" : "border-border bg-background hover:bg-muted/50",
      )}
      type="button"
      onClick={onClick}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-foreground">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <span>
        <span className="block font-semibold">{mediaTypeLabels[card.type]}</span>
        <span className="mt-1 block text-sm leading-6 text-muted-foreground">{card.description}</span>
      </span>
    </button>
  );
}

function ResultCard({
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
    <article className="grid gap-3 rounded-xl border border-border bg-card p-3 shadow-sm sm:grid-cols-[5rem_1fr]">
      <button className="text-left focus:outline-none focus:ring-2 focus:ring-primary" type="button" onClick={onDetails}>
        {match.imageUrl ? (
          <img alt={`Poster for ${match.title}`} className="h-28 w-20 rounded-lg object-cover" src={match.imageUrl} />
        ) : (
          <div className="flex h-28 w-20 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">No image</div>
        )}
      </button>
      <div className="grid gap-2">
        <button className="text-left focus:outline-none focus:ring-2 focus:ring-primary" type="button" onClick={onDetails}>
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            {externalProviderLabels[match.provider]} · {Math.round(match.confidence * 100)}%
          </p>
          <h3 className="mt-1 font-semibold text-foreground">{match.title}</h3>
          <p className="text-sm text-muted-foreground">{[match.creator, match.releaseYear].filter(Boolean).join(" · ") || "Creator/year unknown"}</p>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{match.description || "No description supplied by this provider."}</p>
        </button>
        <Button className="gap-2 justify-self-start" disabled={isQueued} size="sm" type="button" variant={isQueued ? "secondary" : "default"} onClick={onAdd}>
          {isQueued ? <Check aria-hidden="true" className="h-4 w-4" /> : <Plus aria-hidden="true" className="h-4 w-4" />}
          {isQueued ? "Selected" : "Add"}
        </Button>
      </div>
    </article>
  );
}

function QueuedItemCard({
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
    <article className="relative rounded-xl border border-border bg-background p-3">
      <div className="flex gap-3">
        {item.match?.imageUrl ? (
          <img alt="" className="h-16 w-12 rounded-md object-cover" src={item.match.imageUrl} />
        ) : (
          <div className="flex h-16 w-12 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">Manual</div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">{item.form.title || "Untitled"}</h3>
          <p className="text-sm text-muted-foreground">{statusLabels[item.form.status]}{item.form.personalRating ? ` · ${item.form.personalRating}/10` : ""}</p>
          <MediaTypeBadge label={mediaTypeLabels[item.mediaType]} type={item.mediaType} />
        </div>
        <Button aria-label={`Actions for ${item.form.title || "queued title"}`} size="sm" type="button" variant="ghost" onClick={onMenuToggle}>
          <MoreHorizontal aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>
      {menuOpen ? (
        <div className="absolute right-3 top-12 z-10 grid min-w-44 gap-1 rounded-xl border border-border bg-card p-2 shadow-xl">
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
  const rawEntries = Object.entries(match.rawPayload ?? {}).slice(0, 8);
  return (
    <DialogShell
      className="block overflow-y-auto"
      labelledBy="metadata-details-title"
      onClose={onClose}
      panelClassName="mx-auto my-8 w-full max-w-3xl overflow-hidden rounded-xl p-0"
    >
      <div className="grid gap-5 p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          {match.imageUrl ? (
            <img alt={`Poster for ${match.title}`} className="h-48 w-32 shrink-0 rounded-xl object-cover shadow-sm" src={match.imageUrl} />
          ) : (
            <div className="flex h-48 w-32 shrink-0 items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">No image</div>
          )}
          <div className="grid min-w-0 flex-1 gap-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-muted-foreground">{externalProviderLabels[match.provider]}</p>
                <h2 className="mt-1 break-words text-2xl font-semibold" id="metadata-details-title">{match.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{[match.creator, match.releaseYear].filter(Boolean).join(" · ") || "Creator/year unknown"}</p>
              </div>
              <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
            </div>
            <p className="text-sm leading-7 text-muted-foreground">{match.description || "No description supplied by this provider."}</p>
          </div>
        </div>
        <div className="grid gap-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Fact label="Provider rating" value={match.externalRating === null ? "Unknown" : `${match.externalRating}/10`} />
            <Fact label="Popularity" value={match.externalPopularity === null ? "Unknown" : String(match.externalPopularity)} />
            <Fact label="Confidence" value={`${Math.round(match.confidence * 100)}%`} />
          </div>
          {match.sourceUrl ? <a className="text-sm font-semibold text-primary underline-offset-4 hover:underline" href={match.sourceUrl} rel="noreferrer" target="_blank">Open provider source</a> : null}
          {rawEntries.length ? (
            <div className="rounded-xl border border-border bg-background p-4">
              <h3 className="font-semibold">Provider details</h3>
              <dl className="mt-3 grid gap-2 text-sm">
                {rawEntries.map(([key, value]) => (
                  <div className="grid gap-1 sm:grid-cols-[10rem_1fr]" key={key}>
                    <dt className="font-medium text-muted-foreground">{key}</dt>
                    <dd className="min-w-0 break-words text-foreground">{formatRawValue(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
          <Button className="gap-2 justify-self-start" disabled={isQueued} type="button" onClick={() => onAdd(match)}>
            {isQueued ? <Check aria-hidden="true" className="h-4 w-4" /> : <Plus aria-hidden="true" className="h-4 w-4" />}
            {isQueued ? "Already selected" : "Add this title"}
          </Button>
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

  useEffect(() => {
    setDraft(item);
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
      panelClassName="mx-auto my-8 w-full max-w-4xl rounded-xl p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold" id="item-config-title">Configure title</h2>
          <p className="mt-1 text-sm text-muted-foreground">Tune status, rating, notes, and score signals before saving this item.</p>
        </div>
        <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
      </div>
      <div className="mt-6 grid gap-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormFieldWrapper id="config-title" label="Title">
            <TextInput id="config-title" required value={draft.form.title} onChange={(event) => updateForm("title", event.target.value)} />
          </FormFieldWrapper>
          <FormFieldWrapper id="config-original-title" label="Original title">
            <TextInput id="config-original-title" value={draft.form.originalTitle} onChange={(event) => updateForm("originalTitle", event.target.value)} />
          </FormFieldWrapper>
          <FormFieldWrapper id="config-status" label="Status">
            <select className={selectClassName} id="config-status" value={draft.form.status} onChange={(event) => updateForm("status", event.target.value as ConsumptionStatus)}>
              {CONSUMPTION_STATUSES.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
            </select>
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
        <RatingControl value={draft.form.personalRating} onChange={(value) => updateForm("personalRating", value)} />
        <FormFieldWrapper id="config-notes" label="Notes">
          <textarea
            className="min-h-24 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
            id="config-notes"
            value={draft.form.notes}
            onChange={(event) => updateForm("notes", event.target.value)}
          />
        </FormFieldWrapper>
        <DimensionScoreGrid
          dimensions={dimensions}
          drafts={draft.scoreDrafts}
          error={dimensionsError}
          isLoading={isLoadingDimensions}
          onChange={(scoreDrafts) => setDraft((current) => current ? { ...current, scoreDrafts } : current)}
        />
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="button" onClick={() => onSave(draft)}>Apply configuration</Button>
      </div>
    </DialogShell>
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
    <section className="rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-semibold">Personal rating</h3>
        <span className="text-sm font-semibold text-primary">{value.trim() ? `${value}/10` : "Unrated"}</span>
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
      <div className="mt-3 flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            className={cn(
              "rounded-xl border px-3 py-2 text-sm font-semibold transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary",
              value === preset.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-background",
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

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function formatRawValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not provided";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  const serialized = JSON.stringify(value);
  return serialized.length > 320 ? `${serialized.slice(0, 320)}...` : serialized;
}

const selectClassName = cn(
  "h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary",
);
