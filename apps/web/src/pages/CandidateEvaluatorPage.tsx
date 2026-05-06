import type {
  AntiGenericEvaluation,
  Candidate,
  CandidateCreateRequest,
  CandidateEvaluation,
  CandidateStatus,
  CouncilSession,
  MediaType,
} from "@canonos/contracts";
import { CANDIDATE_STATUSES, MEDIA_TYPES } from "@canonos/contracts";
import {
  BookOpenCheck,
  ChevronDown,
  Clock3,
  Dna,
  History,
  LibraryBig,
  PlayCircle,
  Plus,
  Save,
  ShieldAlert,
  ShieldCheck,
  SkipForward,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";

import { MediaTypeBadge } from "@/components/data-display/MediaTypeBadge";
import { PaginationControls } from "@/components/data-display/PaginationControls";
import { ScoreBadge } from "@/components/data-display/ScoreBadge";
import { StatusPill } from "@/components/data-display/StatusPill";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { ListSkeleton } from "@/components/feedback/ListSkeleton";
import { LoadingState } from "@/components/feedback/LoadingState";
import { DialogShell } from "@/components/feedback/DialogShell";
import { CommandSearchInput } from "@/components/forms/CommandSearchInput";
import { Button } from "@/components/ui/button";
import {
  addCandidateToLibrary,
  createCandidate,
  evaluateCandidate,
  updateCandidate,
  useCandidates,
} from "@/features/candidate-evaluator/candidateApi";
import {
  candidateStatusLabels,
  candidateStatusTone,
  evaluationDecisionLabels,
} from "@/features/candidate-evaluator/candidateLabels";
import { useCouncilSessions } from "@/features/critic-council/councilApi";
import { councilDecisionTone } from "@/features/critic-council/councilLabels";
import { mediaTypeLabels } from "@/features/media/mediaLabels";
import { createQueueItem } from "@/features/queue/queueApi";
import { useUserSettings } from "@/features/settings/settingsApi";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { DEFAULT_PAGE_SIZE, pageFromSearchParams } from "@/lib/pagination";
import { cn } from "@/lib/utils";

type CandidateDraft = {
  title: string;
  mediaType: MediaType;
  releaseYear: string;
  knownCreator: string;
  premise: string;
  sourceOfInterest: string;
  hypeLevel: string;
  expectedGenericness: string;
  expectedTimeCostMinutes: string;
};

const emptyDraft: CandidateDraft = {
  title: "",
  mediaType: "movie",
  releaseYear: "",
  knownCreator: "",
  premise: "",
  sourceOfInterest: "",
  hypeLevel: "5",
  expectedGenericness: "5",
  expectedTimeCostMinutes: "120",
};

export function CandidateEvaluatorPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchDraft, setSearchDraft] = useState(searchParams.get("search") ?? "");
  const debouncedSearch = useDebouncedValue(searchDraft);
  const page = pageFromSearchParams(searchParams);
  const selectedMediaType = (searchParams.get("mediaType") ?? "") as MediaType | "";
  const selectedStatus = (searchParams.get("status") ?? "") as CandidateStatus | "";
  const { data, error, isLoading, mutate } = useCandidates({
    mediaType: selectedMediaType,
    page,
    search: debouncedSearch,
    status: selectedStatus,
  });
  const { data: userSettings } = useUserSettings();
  const [draft, setDraft] = useState<CandidateDraft>(emptyDraft);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [evaluation, setEvaluation] = useState<CandidateEvaluation | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isLibrarySaving, setIsLibrarySaving] = useState(false);
  const [isQueueSaving, setIsQueueSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const latestEvaluation = evaluation ?? selectedCandidate?.latestEvaluation ?? null;
  const candidates = useMemo(() => data?.results ?? [], [data]);
  const selectedCandidateId = searchParams.get("candidateId");

  useEffect(() => {
    const currentSearch = searchParams.get("search") ?? "";
    if (debouncedSearch === currentSearch) return;
    const next = new URLSearchParams(searchParams);
    if (debouncedSearch.trim()) next.set("search", debouncedSearch.trim());
    else next.delete("search");
    next.delete("page");
    setSearchParams(next, { replace: true });
  }, [debouncedSearch, searchParams, setSearchParams]);

  function updateListFilter(key: "mediaType" | "status", value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setSearchParams(next, { replace: true });
  }

  function updatePage(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    if (nextPage <= 1) next.delete("page");
    else next.set("page", String(nextPage));
    setSearchParams(next, { replace: true });
  }

  useEffect(() => {
    if (!selectedCandidateId || selectedCandidate?.id === selectedCandidateId) return;
    const candidate = candidates.find((item) => item.id === selectedCandidateId);
    if (!candidate) return;
    setDraft(candidateToDraft(candidate));
    setSelectedCandidate(candidate);
    setEvaluation(candidate.latestEvaluation);
    setFormError(null);
    setActionMessage(null);
  }, [candidates, selectedCandidate?.id, selectedCandidateId]);

  function updateDraft(field: keyof CandidateDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function resetDraft() {
    setDraft(emptyDraft);
    setSelectedCandidate(null);
    setEvaluation(null);
    setFormError(null);
    setActionMessage(null);
  }

  function loadCandidate(candidate: Candidate) {
    setDraft(candidateToDraft(candidate));
    setSelectedCandidate(candidate);
    setEvaluation(candidate.latestEvaluation);
    setFormError(null);
    setActionMessage(null);
    setIsHistoryOpen(false);
  }

  async function saveCurrentCandidate() {
    setFormError(null);
    setActionMessage(null);
    const request = buildCandidateRequest(draft);
    if (!request) {
      setFormError("Add a title before saving this candidate.");
      return null;
    }

    setIsSaving(true);
    try {
      const saved = selectedCandidate
        ? await updateCandidate(selectedCandidate.id, request)
        : await createCandidate(request);
      setSelectedCandidate(saved);
      setEvaluation(saved.latestEvaluation);
      await mutate();
      setActionMessage("Candidate saved to evaluator history.");
      return saved;
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Could not save candidate.");
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  async function runEvaluation() {
    setFormError(null);
    setActionMessage(null);
    const request = buildCandidateRequest(draft);
    if (!request) {
      setFormError("Add a title before running an evaluation.");
      return;
    }

    setIsEvaluating(true);
    try {
      const candidate = selectedCandidate
        ? await updateCandidate(selectedCandidate.id, request)
        : await createCandidate(request);
      const result = await evaluateCandidate(candidate.id);
      setSelectedCandidate(result.candidate);
      setEvaluation(result.evaluation);
      await mutate();
      setActionMessage("Evaluation saved with the candidate history.");
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Could not evaluate candidate.");
    } finally {
      setIsEvaluating(false);
    }
  }

  async function skipCandidate() {
    if (!selectedCandidate) return;
    setFormError(null);
    setActionMessage(null);
    try {
      const skipped = await updateCandidate(selectedCandidate.id, { status: "skip" });
      setSelectedCandidate(skipped);
      setEvaluation(skipped.latestEvaluation);
      await mutate();
      setActionMessage("Candidate marked as skipped.");
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Could not skip candidate.");
    }
  }

  async function addToQueue() {
    if (!selectedCandidate || !latestEvaluation) return;
    setFormError(null);
    setActionMessage(null);
    setIsQueueSaving(true);
    try {
      await createQueueItem({
        candidateId: selectedCandidate.id,
        priority: latestEvaluation.decision === "watch_now" ? "start_soon" : latestEvaluation.decision === "sample" ? "sample_first" : "later",
        reason: latestEvaluation.recommendedAction,
        bestMood: latestEvaluation.bestMood,
        estimatedTimeMinutes: selectedCandidate.expectedTimeCostMinutes,
      });
      setActionMessage(`Added “${selectedCandidate.title}” to the queue.`);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Could not add candidate to queue.");
    } finally {
      setIsQueueSaving(false);
    }
  }

  async function addToLibrary() {
    if (!selectedCandidate) return;
    setFormError(null);
    setActionMessage(null);
    setIsLibrarySaving(true);
    try {
      const response = await addCandidateToLibrary(selectedCandidate.id, {
        status: "planned",
        notes: "Added from the candidate evaluator.",
      });
      setSelectedCandidate(response.candidate);
      await mutate();
      setActionMessage(`Added “${response.mediaItem.title}” to the library as Planned.`);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Could not add candidate to library.");
    } finally {
      setIsLibrarySaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="grid gap-4 border-b border-border pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Decision desk</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              Candidate Evaluator
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Test a title against fit, regret risk, time cost, and your anti-generic rules.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsHistoryOpen(true)}>
              <History aria-hidden="true" className="mr-2 h-4 w-4" />
              History{data?.count ? ` (${data.count})` : ""}
            </Button>
            <Button type="button" onClick={resetDraft}>
              <Plus aria-hidden="true" className="mr-2 h-4 w-4" />
              New Candidate
            </Button>
          </div>
        </div>
        {userSettings ? <GuardrailPanel settings={userSettings.recommendation} /> : null}
      </section>

      <div className="grid min-h-[34rem] gap-6 xl:grid-cols-[minmax(26rem,0.85fr)_minmax(34rem,1.15fr)]">
        <CandidateInputPanel
          draft={draft}
          isEvaluating={isEvaluating}
          isSaving={isSaving}
          selectedCandidate={selectedCandidate}
          onChange={updateDraft}
          onEvaluate={() => void runEvaluation()}
          onSave={() => void saveCurrentCandidate()}
        />

        <div className="flex flex-col gap-6">
          {formError ? <ErrorState title="Candidate action failed" message={formError} /> : null}
          {actionMessage ? <SuccessMessage message={actionMessage} /> : null}
          <EvaluationResultCard
            candidate={selectedCandidate}
            evaluation={latestEvaluation}
            isLibrarySaving={isLibrarySaving}
            isQueueSaving={isQueueSaving}
            onAddToLibrary={() => void addToLibrary()}
            onAddToQueue={() => void addToQueue()}
            onSkip={() => void skipCandidate()}
          />
          {selectedCandidate ? <CandidateCouncilSessions candidateId={selectedCandidate.id} /> : null}
        </div>
      </div>

      {isHistoryOpen ? (
        <CandidateHistoryDialog
          candidates={candidates}
          data={data}
          error={error}
          isLoading={isLoading}
          mediaType={selectedMediaType}
          page={Number(page)}
          search={searchDraft}
          selectedId={selectedCandidate?.id}
          status={selectedStatus}
          onClose={() => setIsHistoryOpen(false)}
          onMediaTypeChange={(value) => updateListFilter("mediaType", value)}
          onPageChange={updatePage}
          onRetry={() => void mutate()}
          onSearchChange={setSearchDraft}
          onSelect={loadCandidate}
          onStatusChange={(value) => updateListFilter("status", value)}
        />
      ) : null}
    </div>
  );
}

function GuardrailPanel({
  settings,
}: {
  settings: NonNullable<ReturnType<typeof useUserSettings>["data"]>["recommendation"];
}) {
  return (
    <section aria-label="Candidate guardrails" className="grid gap-2 md:grid-cols-4">
      <GuardrailMeter label="Genericness" value={settings.genericnessSensitivity} />
      <GuardrailMeter label="Modern skepticism" value={settings.modernMediaSkepticismLevel} />
      <GuardrailMeter label="Strictness" value={settings.preferredRecommendationStrictness} />
      <div className="border-l-4 border-promising bg-promising/10 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Exceptions</p>
        <p className="mt-1 text-sm font-semibold">
          {settings.allowModernExceptions ? "Modern exceptions allowed" : "Modern exceptions blocked"}
        </p>
      </div>
    </section>
  );
}

function GuardrailMeter({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-l-4 border-primary bg-muted/35 px-3 py-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold tabular-nums">{value}/10</p>
      </div>
      <div className="mt-2 h-1.5 bg-border">
        <div className="h-full bg-primary" style={{ width: `${Math.max(0, Math.min(value, 10)) * 10}%` }} />
      </div>
    </div>
  );
}

function CandidateHistoryDialog({
  candidates,
  data,
  error,
  isLoading,
  mediaType,
  page,
  search,
  selectedId,
  status,
  onClose,
  onMediaTypeChange,
  onPageChange,
  onRetry,
  onSearchChange,
  onSelect,
  onStatusChange,
}: {
  candidates: Candidate[];
  data: { count: number } | undefined;
  error: Error | undefined;
  isLoading: boolean;
  mediaType: MediaType | "";
  page: number;
  search: string;
  selectedId?: string;
  status: CandidateStatus | "";
  onClose: () => void;
  onMediaTypeChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onSearchChange: (value: string) => void;
  onSelect: (candidate: Candidate) => void;
  onStatusChange: (value: string) => void;
}) {
  return (
    <DialogShell labelledBy="candidate-history-title" onClose={onClose} panelClassName="max-w-5xl p-0">
      <div className="border-b border-border p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Evaluator log</p>
            <h2 className="mt-2 text-2xl font-semibold" id="candidate-history-title">Candidate history</h2>
            <p className="mt-1 text-sm text-muted-foreground">Search, filter, and reopen previous evaluations.</p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
        </div>
        <div className="mt-4">
          <CandidateHistoryControls
            mediaType={mediaType}
            search={search}
            status={status}
            onMediaTypeChange={onMediaTypeChange}
            onSearchChange={onSearchChange}
            onStatusChange={onStatusChange}
          />
        </div>
      </div>
      <div className="max-h-[70vh] overflow-y-auto p-5">
        {isLoading ? <ListSkeleton label="Loading candidates" rows={6} /> : null}
        {error ? <ErrorState title="Candidate history unavailable" message={error.message} onRetry={onRetry} /> : null}
        {!isLoading && !error && candidates.length === 0 ? (
          <EmptyState
            title="No candidates yet"
            message="Save or evaluate your first possible media choice, then it will appear here for comparison."
          />
        ) : null}
        {!isLoading && !error && data && candidates.length > 0 ? (
          <div className="grid gap-4">
            <PaginationControls
              count={data.count}
              itemLabel="candidate"
              page={page}
              pageSize={DEFAULT_PAGE_SIZE}
              onPageChange={onPageChange}
            />
            <CandidateHistory candidates={candidates} selectedId={selectedId} onSelect={onSelect} />
          </div>
        ) : null}
      </div>
    </DialogShell>
  );
}

function CandidateHistoryControls({
  mediaType,
  search,
  status,
  onMediaTypeChange,
  onSearchChange,
  onStatusChange,
}: {
  mediaType: MediaType | "";
  search: string;
  status: CandidateStatus | "";
  onMediaTypeChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}) {
  return (
    <section aria-label="Candidate history controls" className="border-y border-border py-4">
      <div className="grid gap-3 md:grid-cols-[minmax(14rem,1fr)_12rem_12rem]">
        <CommandSearchInput
          aria-label="Search candidate history"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        <label className="grid gap-1 text-sm font-medium">
          <span className="sr-only">Filter candidates by media type</span>
          <select
            className={fieldClassName}
            value={mediaType}
            onChange={(event) => onMediaTypeChange(event.target.value)}
          >
            <option value="">All media types</option>
            {MEDIA_TYPES.map((type) => (
              <option key={type} value={type}>
                {mediaTypeLabels[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          <span className="sr-only">Filter candidates by status</span>
          <select
            className={fieldClassName}
            value={status}
            onChange={(event) => onStatusChange(event.target.value)}
          >
            <option value="">All statuses</option>
            {CANDIDATE_STATUSES.map((candidateStatus) => (
              <option key={candidateStatus} value={candidateStatus}>
                {candidateStatusLabels[candidateStatus]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

function CandidateInputPanel({
  draft,
  isEvaluating,
  isSaving,
  selectedCandidate,
  onChange,
  onEvaluate,
  onSave,
}: {
  draft: CandidateDraft;
  isEvaluating: boolean;
  isSaving: boolean;
  selectedCandidate: Candidate | null;
  onChange: (field: keyof CandidateDraft, value: string) => void;
  onEvaluate: () => void;
  onSave: () => void;
}) {
  const [contextOpen, setContextOpen] = useState(false);
  const contextSummary = [
    draft.knownCreator.trim() || null,
    draft.releaseYear.trim() || null,
    draft.expectedTimeCostMinutes.trim() ? `${draft.expectedTimeCostMinutes.trim()} min` : null,
  ].filter(Boolean);

  return (
    <section aria-label="Candidate input" className="grid content-start gap-4 border-r border-border pr-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Evaluate</h2>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {selectedCandidate ? "Editing saved candidate" : "New run"}
          </span>
        </div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Title, type, premise. Everything else is optional context.
        </p>
      </div>

      <div className="grid gap-3">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem]">
          <TextField label="Title" required value={draft.title} onChange={(value) => onChange("title", value)} />
          <label className="grid gap-1.5 text-sm font-medium">
            Media type
            <select
              className={fieldClassName}
              value={draft.mediaType}
              onChange={(event) => onChange("mediaType", event.target.value)}
            >
              {MEDIA_TYPES.map((type) => (
                <option key={type} value={type}>
                  {mediaTypeLabels[type]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="grid gap-1.5 text-sm font-medium">
          Premise
          <textarea
            className={cn(fieldClassName, "min-h-28 resize-y py-3 leading-6")}
            placeholder="What is it, why might it work, and what might be generic about it?"
            value={draft.premise}
            onChange={(event) => onChange("premise", event.target.value)}
          />
        </label>
      </div>

      <div className="border-y border-border py-3">
        <button
          aria-expanded={contextOpen}
          className="flex w-full items-center justify-between gap-4 text-left"
          type="button"
          onClick={() => setContextOpen((current) => !current)}
        >
          <div>
            <span className="block text-sm font-semibold">More context</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              {contextSummary.length > 0
                ? contextSummary.join(" · ")
                : "Creator, release year, time cost, and signal strength."}
            </span>
          </div>
          <ChevronDown
            aria-hidden="true"
            className={cn("h-5 w-5 text-muted-foreground transition", contextOpen ? "rotate-180" : "")}
          />
        </button>

        {contextOpen ? (
          <div className="mt-4 grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="Release year" type="number" value={draft.releaseYear} onChange={(value) => onChange("releaseYear", value)} />
              <TextField label="Known creator" value={draft.knownCreator} onChange={(value) => onChange("knownCreator", value)} />
            </div>
            <TextField label="Source of interest" value={draft.sourceOfInterest} onChange={(value) => onChange("sourceOfInterest", value)} />
            <TimeCostPicker value={draft.expectedTimeCostMinutes} onChange={(value) => onChange("expectedTimeCostMinutes", value)} />
            <SignalSlider
              label="Hype level"
              value={draft.hypeLevel}
              lowLabel="Mild curiosity"
              highLabel="Very excited"
              onChange={(value) => onChange("hypeLevel", value)}
            />
            <SignalSlider
              label="Expected genericness"
              value={draft.expectedGenericness}
              lowLabel="Distinctive"
              highLabel="Likely formulaic"
              onChange={(value) => onChange("expectedGenericness", value)}
            />
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3 pt-1">
        <Button disabled={isSaving || isEvaluating} type="button" variant="secondary" onClick={onSave}>
          <Save aria-hidden="true" className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : "Save Candidate"}
        </Button>
        <Button disabled={isSaving || isEvaluating} type="button" onClick={onEvaluate}>
          <PlayCircle aria-hidden="true" className="mr-2 h-4 w-4" />
          {isEvaluating ? "Evaluating..." : "Run Evaluation"}
        </Button>
      </div>
    </section>
  );
}

function TimeCostPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const presets = [
    { label: "30m", value: "30" },
    { label: "1h", value: "60" },
    { label: "90m", value: "90" },
    { label: "2h", value: "120" },
    { label: "3h+", value: "180" },
  ];

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium" htmlFor="expected-time-cost">
          Expected time cost
        </label>
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock3 aria-hidden="true" className="h-4 w-4" />
          {value.trim() ? `${value} min` : "Not set"}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition",
              value === preset.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-muted",
            )}
            key={preset.value}
            type="button"
            onClick={() => onChange(preset.value)}
          >
            {preset.label}
          </button>
        ))}
        <input
          className={cn(fieldClassName, "w-28")}
          id="expected-time-cost"
          min={0}
          type="number"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}

function SignalSlider({
  highLabel,
  label,
  lowLabel,
  value,
  onChange,
}: {
  highLabel: string;
  label: string;
  lowLabel: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const numericValue = Number.parseInt(value, 10);
  const displayValue = Number.isNaN(numericValue) ? 0 : numericValue;

  return (
    <label className="grid gap-2 text-sm font-medium">
      <span className="flex items-center justify-between gap-3">
        <span>{label}</span>
        <span className="text-primary">{Number.isNaN(numericValue) ? "Blank" : `${displayValue}/10`}</span>
      </span>
      <input
        aria-label={label}
        className="h-2 w-full accent-primary"
        max={10}
        min={0}
        type="range"
        value={displayValue}
        onChange={(event) => onChange(event.target.value)}
      />
      <span className="flex justify-between text-xs font-normal text-muted-foreground">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </span>
    </label>
  );
}

function EvaluationResultCard({
  candidate,
  evaluation,
  isLibrarySaving,
  isQueueSaving,
  onAddToLibrary,
  onAddToQueue,
  onSkip,
}: {
  candidate: Candidate | null;
  evaluation: CandidateEvaluation | null;
  isLibrarySaving: boolean;
  isQueueSaving: boolean;
  onAddToLibrary: () => void;
  onAddToQueue: () => void;
  onSkip: () => void;
}) {
  if (!candidate || !evaluation) {
    return (
      <section aria-label="Evaluation result" className="border-l border-border pl-6">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Evaluation result</p>
        <h2 className="mt-4 text-2xl font-semibold">No verdict yet</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Run the evaluator to get a decision, confidence, fit, risk, reasons, and the next best action.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Evaluation result" className="border-l border-border pl-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Evaluation result</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">{evaluationDecisionLabels[evaluation.decision]}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{candidate.title}</p>
        </div>
        <StatusPill label={candidateStatusLabels[candidate.status]} tone={candidateStatusTone[candidate.status]} />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Metric label="Confidence" score={evaluation.confidenceScore} tone="promising" />
        <Metric label="Likely fit" score={evaluation.likelyFitScore} tone="excellent" />
        <Metric label="Risk" score={evaluation.riskScore} tone={evaluation.riskScore >= 65 ? "avoid" : "risky"} />
      </div>

      <div className="mt-6 grid gap-6">
        {evaluation.antiGenericEvaluation ? <AntiGenericSection evaluation={evaluation.antiGenericEvaluation} /> : null}
        {evaluation.narrativeSignals.length > 0 ? (
          <NarrativeSignalSection signals={evaluation.narrativeSignals} />
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          <ReasonList title="Why it may work" reasons={evaluation.reasonsFor} />
          <ReasonList title="Risks / reasons against" reasons={evaluation.reasonsAgainst} />
        </div>

        <div className="border-t border-border pt-4 text-sm leading-6">
          <p><span className="font-semibold">Best mood:</span> {evaluation.bestMood}</p>
          <p className="mt-2"><span className="font-semibold">Recommended action:</span> {evaluation.recommendedAction}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button disabled={isQueueSaving} type="button" variant="secondary" onClick={onAddToQueue}>
            <BookOpenCheck aria-hidden="true" className="mr-2 h-4 w-4" />
            {isQueueSaving ? "Adding..." : "Add To Queue"}
          </Button>
          <Button disabled={isLibrarySaving} type="button" onClick={onAddToLibrary}>
            <LibraryBig aria-hidden="true" className="mr-2 h-4 w-4" />
            {isLibrarySaving ? "Adding..." : "Add To Library"}
          </Button>
          <Button className="text-avoid hover:text-avoid" type="button" variant="ghost" onClick={onSkip}>
            <SkipForward aria-hidden="true" className="mr-2 h-4 w-4" />
            Skip Candidate
          </Button>
        </div>
      </div>
    </section>
  );
}

function CandidateCouncilSessions({ candidateId }: { candidateId: string }) {
  const { data, error, isLoading, mutate } = useCouncilSessions({ candidateId });
  const sessions = data?.results ?? [];

  return (
    <section aria-labelledby="critic-council-results" className="border-t border-border pt-6">
      <h2 className="text-lg font-semibold" id="critic-council-results">Critic Council results</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Council debates attached to this candidate appear here after you run Critic Council.
      </p>
      {isLoading ? <LoadingState title="Loading council results" message="Fetching candidate debates." /> : null}
      {error ? <ErrorState title="Council results unavailable" message={error.message} onRetry={() => void mutate()} /> : null}
      {!isLoading && !error && sessions.length === 0 ? (
        <p className="mt-4 border-l border-border pl-4 text-sm text-muted-foreground">
          No Critic Council result is attached to this candidate yet.
        </p>
      ) : null}
      {!isLoading && !error && sessions.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {sessions.slice(0, 3).map((session: CouncilSession) => (
            <article className="border-t border-border pt-4" key={session.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{session.finalDecision.label}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {session.finalDecision.explanation}
                  </p>
                </div>
                <StatusPill
                  label={session.finalDecision.label}
                  tone={councilDecisionTone[session.finalDecision.decision]}
                />
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

const antiGenericVerdictLabels: Record<AntiGenericEvaluation["finalVerdict"], string> = {
  low_risk: "Low genericness risk",
  sample_with_guardrail: "Sample with guardrail",
  likely_generic_skip: "Likely generic skip",
  modern_exception: "Modern exception",
};

function AntiGenericSection({ evaluation }: { evaluation: AntiGenericEvaluation }) {
  return (
    <section className="border-t border-risky/30 pt-4" aria-labelledby="anti-generic-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold" id="anti-generic-heading">
            <ShieldAlert aria-hidden="true" className="h-4 w-4 text-risky" />
            Anti-Generic Filter
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {antiGenericVerdictLabels[evaluation.finalVerdict]} based on red flags and positive exception rules.
          </p>
        </div>
        <ScoreBadge label="generic risk" score={evaluation.genericnessRiskScore} tone={evaluation.genericnessRiskScore >= 70 ? "avoid" : "risky"} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Genericness risk" score={evaluation.genericnessRiskScore} tone={evaluation.genericnessRiskScore >= 70 ? "avoid" : "risky"} />
        <Metric label="Time-waste risk" score={evaluation.timeWasteRiskScore} tone={evaluation.timeWasteRiskScore >= 70 ? "avoid" : "risky"} />
        <Metric label="Positive exception" score={evaluation.positiveExceptionScore} tone="promising" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SignalList
          empty="No specific red flags were detected."
          icon={<ShieldAlert aria-hidden="true" className="h-4 w-4 text-risky" />}
          signals={evaluation.detectedSignals}
          title="Detected red flags"
        />
        <SignalList
          empty="No positive exception rule fired."
          icon={<ShieldCheck aria-hidden="true" className="h-4 w-4 text-promising" />}
          signals={evaluation.positiveExceptions}
          title="Positive exceptions"
        />
      </div>
    </section>
  );
}

function NarrativeSignalSection({ signals }: { signals: CandidateEvaluation["narrativeSignals"] }) {
  return (
    <section className="border-t border-primary/30 pt-4" aria-labelledby="narrative-signals-heading">
      <h3 className="flex items-center gap-2 font-semibold" id="narrative-signals-heading">
        <Dna aria-hidden="true" className="h-4 w-4 text-primary" />
        Narrative DNA signals
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Candidate scoring used completed Narrative DNA traits from your media library.
      </p>
      <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
        {signals.map((signal) => (
          <li className="border-l border-primary/30 pl-3" key={`${signal.traitKey}-${signal.label}`}>
            <span className="font-medium text-foreground">{signal.label}</span>
            <span className="ml-2 text-xs">
              {signal.impact > 0 ? "+" : ""}
              {signal.impact} · avg {signal.averageScore}/100
            </span>
            <p className="mt-1 leading-5">{signal.evidence}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SignalList({
  empty,
  icon,
  signals,
  title,
}: {
  empty: string;
  icon: ReactNode;
  signals: AntiGenericEvaluation["detectedSignals"];
  title: string;
}) {
  return (
    <div>
      <h4 className="flex items-center gap-2 text-sm font-semibold">{icon}{title}</h4>
      {signals.length > 0 ? (
        <ul className="mt-2 grid gap-2 text-sm text-muted-foreground">
          {signals.map((signal) => (
            <li className="border-l border-border pl-3" key={signal.ruleKey}>
              <span className="font-medium text-foreground">{signal.name}</span>
              <span className="ml-2 text-xs">+{signal.score}</span>
              <p className="mt-1 leading-5">{signal.evidence}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}

function CandidateHistory({
  candidates,
  selectedId,
  onSelect,
}: {
  candidates: Candidate[];
  selectedId?: string;
  onSelect: (candidate: Candidate) => void;
}) {
  return (
    <section aria-label="Candidate history">
      <div className="border-b border-border pb-4">
        <h2 className="text-lg font-semibold">Candidate history</h2>
        <p className="mt-1 text-sm text-muted-foreground">Saved evaluations stay here so you can compare and revisit them.</p>
      </div>
      <div className="divide-y divide-border">
        {candidates.map((candidate) => (
          <button
            className={cn(
              "grid w-full gap-3 py-5 text-left transition hover:bg-muted/30 md:grid-cols-[minmax(0,1fr)_auto]",
              candidate.id === selectedId ? "bg-muted/40 px-4" : "",
            )}
            key={candidate.id}
            type="button"
            onClick={() => onSelect(candidate)}
          >
            <span>
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{candidate.title}</span>
                <MediaTypeBadge type={candidate.mediaType} label={mediaTypeLabels[candidate.mediaType]} />
                <StatusPill label={candidateStatusLabels[candidate.status]} tone={candidateStatusTone[candidate.status]} />
              </span>
              <span className="mt-2 block text-sm text-muted-foreground">
                {candidate.knownCreator || "Creator unknown"}{candidate.releaseYear ? ` · ${candidate.releaseYear}` : ""}
              </span>
            </span>
            <span className="flex flex-wrap items-center gap-2 md:justify-end">
              <ScoreBadge score={candidate.latestEvaluation?.confidenceScore} label="confidence" tone="promising" />
              <ScoreBadge score={candidate.latestEvaluation?.riskScore} label="risk" tone="risky" />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function TextField({
  label,
  max,
  min,
  required,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  max?: number;
  min?: number;
  required?: boolean;
  type?: "number" | "text";
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <input
        className={fieldClassName}
        max={max}
        min={min}
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Metric({ label, score, tone }: { label: string; score: number; tone: "excellent" | "promising" | "risky" | "avoid" }) {
  return (
    <div className="border-t border-border pt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-2"><ScoreBadge score={score} tone={tone} /></div>
    </div>
  );
}

function ReasonList({ title, reasons }: { title: string; reasons: string[] }) {
  return (
    <div>
      <h3 className="font-semibold">{title}</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
        {reasons.map((reason) => <li key={reason}>{reason}</li>)}
      </ul>
    </div>
  );
}

function SuccessMessage({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-promising/30 bg-promising/10 p-4 text-sm font-medium text-promising" role="status">
      {message}
    </div>
  );
}

function buildCandidateRequest(draft: CandidateDraft): CandidateCreateRequest | null {
  const title = draft.title.trim();
  if (!title) return null;
  return {
    title,
    mediaType: draft.mediaType,
    releaseYear: parseOptionalInteger(draft.releaseYear),
    knownCreator: draft.knownCreator.trim(),
    premise: draft.premise.trim(),
    sourceOfInterest: draft.sourceOfInterest.trim(),
    hypeLevel: parseOptionalInteger(draft.hypeLevel),
    expectedGenericness: parseOptionalInteger(draft.expectedGenericness),
    expectedTimeCostMinutes: parseOptionalInteger(draft.expectedTimeCostMinutes),
  };
}

function parseOptionalInteger(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function candidateToDraft(candidate: Candidate): CandidateDraft {
  return {
    title: candidate.title,
    mediaType: candidate.mediaType,
    releaseYear: candidate.releaseYear?.toString() ?? "",
    knownCreator: candidate.knownCreator,
    premise: candidate.premise,
    sourceOfInterest: candidate.sourceOfInterest,
    hypeLevel: candidate.hypeLevel?.toString() ?? "",
    expectedGenericness: candidate.expectedGenericness?.toString() ?? "",
    expectedTimeCostMinutes: candidate.expectedTimeCostMinutes?.toString() ?? "",
  };
}

const fieldClassName = cn(
  "h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary",
);
