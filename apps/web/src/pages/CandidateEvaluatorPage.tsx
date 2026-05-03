import type {
  AntiGenericEvaluation,
  Candidate,
  CandidateCreateRequest,
  CandidateEvaluation,
  MediaType,
} from "@canonos/contracts";
import { MEDIA_TYPES } from "@canonos/contracts";
import {
  BookOpenCheck,
  LibraryBig,
  PlayCircle,
  RotateCcw,
  Save,
  ShieldAlert,
  ShieldCheck,
  SkipForward,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { MediaTypeBadge } from "@/components/data-display/MediaTypeBadge";
import { ScoreBadge } from "@/components/data-display/ScoreBadge";
import { StatusPill } from "@/components/data-display/StatusPill";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { PageSubtitle, PageTitle } from "@/components/layout/PageText";
import { SectionCard } from "@/components/layout/SectionCard";
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
import { mediaTypeLabels } from "@/features/media/mediaLabels";
import { createQueueItem } from "@/features/queue/queueApi";
import { useUserSettings } from "@/features/settings/settingsApi";
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
  const { data, error, isLoading, mutate } = useCandidates();
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

  const latestEvaluation = evaluation ?? selectedCandidate?.latestEvaluation ?? null;
  const candidates = useMemo(() => data?.results ?? [], [data]);

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
    <div className="flex flex-col gap-6">
      <section>
        <PageTitle>Candidate Evaluator</PageTitle>
        <PageSubtitle>
          Score a possible watch, read, or listen against your history, genericness risk, time cost, and confidence.
        </PageSubtitle>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
        {userSettings ? (
          <div className="rounded-2xl border border-risky/30 bg-risky/10 p-4 text-sm text-risky xl:col-span-2">
            Candidate Evaluator is using your saved genericness sensitivity: {userSettings.recommendation.genericnessSensitivity}/10
            and modern media skepticism: {userSettings.recommendation.modernMediaSkepticismLevel}/10.
          </div>
        ) : null}

        <CandidateInputCard
          draft={draft}
          isEvaluating={isEvaluating}
          isSaving={isSaving}
          selectedCandidate={selectedCandidate}
          onChange={updateDraft}
          onEvaluate={() => void runEvaluation()}
          onReset={resetDraft}
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
        </div>
      </div>

      {isLoading ? <LoadingState title="Loading candidates" message="Fetching evaluator history." /> : null}
      {error ? <ErrorState title="Candidate history unavailable" message={error.message} onRetry={() => void mutate()} /> : null}
      {!isLoading && !error && candidates.length === 0 ? (
        <EmptyState
          title="No candidates yet"
          message="Save or evaluate your first possible media choice, then it will appear here for comparison."
          actionLabel="New Candidate"
          onAction={resetDraft}
        />
      ) : null}
      {!isLoading && !error && candidates.length > 0 ? (
        <CandidateHistory candidates={candidates} selectedId={selectedCandidate?.id} onSelect={loadCandidate} />
      ) : null}
    </div>
  );
}

function CandidateInputCard({
  draft,
  isEvaluating,
  isSaving,
  selectedCandidate,
  onChange,
  onEvaluate,
  onReset,
  onSave,
}: {
  draft: CandidateDraft;
  isEvaluating: boolean;
  isSaving: boolean;
  selectedCandidate: Candidate | null;
  onChange: (field: keyof CandidateDraft, value: string) => void;
  onEvaluate: () => void;
  onReset: () => void;
  onSave: () => void;
}) {
  return (
    <SectionCard title="Candidate input">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Candidate input</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedCandidate ? "Editing saved candidate" : "Create a candidate and run a first-pass heuristic."}
            </p>
          </div>
          <Button type="button" variant="ghost" onClick={onReset}>
            <RotateCcw aria-hidden="true" className="mr-2 h-4 w-4" />
            New Candidate
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
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
          <TextField label="Release year" type="number" value={draft.releaseYear} onChange={(value) => onChange("releaseYear", value)} />
          <TextField label="Known creator" value={draft.knownCreator} onChange={(value) => onChange("knownCreator", value)} />
          <TextField label="Source of interest" value={draft.sourceOfInterest} onChange={(value) => onChange("sourceOfInterest", value)} />
          <TextField
            label="Expected time cost (minutes)"
            min={0}
            type="number"
            value={draft.expectedTimeCostMinutes}
            onChange={(value) => onChange("expectedTimeCostMinutes", value)}
          />
          <TextField label="Hype level (0-10)" max={10} min={0} type="number" value={draft.hypeLevel} onChange={(value) => onChange("hypeLevel", value)} />
          <TextField
            label="Expected genericness (0-10)"
            max={10}
            min={0}
            type="number"
            value={draft.expectedGenericness}
            onChange={(value) => onChange("expectedGenericness", value)}
          />
        </div>

        <label className="grid gap-1.5 text-sm font-medium">
          Premise / signal notes
          <textarea
            className={cn(fieldClassName, "min-h-28 resize-y py-3")}
            placeholder="What is it, why might it work, and what might be generic about it?"
            value={draft.premise}
            onChange={(event) => onChange("premise", event.target.value)}
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <Button disabled={isSaving || isEvaluating} type="button" variant="secondary" onClick={onSave}>
            <Save aria-hidden="true" className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save Candidate"}
          </Button>
          <Button disabled={isSaving || isEvaluating} type="button" onClick={onEvaluate}>
            <PlayCircle aria-hidden="true" className="mr-2 h-4 w-4" />
            {isEvaluating ? "Evaluating..." : "Run Evaluation"}
          </Button>
        </div>
      </div>
    </SectionCard>
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
      <SectionCard title="Evaluation result">
        <div className="rounded-2xl border border-dashed border-border p-6 text-center">
          <h2 className="text-lg font-semibold">No evaluation yet</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Save a candidate or run the evaluator to see confidence, fit, risk, reasons, and a recommended action.
          </p>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Evaluation result">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Primary action</p>
            <h2 className="mt-1 text-2xl font-semibold">{evaluationDecisionLabels[evaluation.decision]}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{candidate.title}</p>
          </div>
          <StatusPill label={candidateStatusLabels[candidate.status]} tone={candidateStatusTone[candidate.status]} />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Confidence" score={evaluation.confidenceScore} tone="promising" />
          <Metric label="Likely fit" score={evaluation.likelyFitScore} tone="excellent" />
          <Metric label="Risk" score={evaluation.riskScore} tone={evaluation.riskScore >= 65 ? "avoid" : "risky"} />
        </div>

        {evaluation.antiGenericEvaluation ? <AntiGenericSection evaluation={evaluation.antiGenericEvaluation} /> : null}

        <ReasonList title="Why it may work" reasons={evaluation.reasonsFor} />
        <ReasonList title="Risks / reasons against" reasons={evaluation.reasonsAgainst} />

        <div className="rounded-2xl bg-muted/60 p-4 text-sm leading-6">
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
    </SectionCard>
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
    <section className="rounded-2xl border border-risky/25 bg-risky/5 p-4" aria-labelledby="anti-generic-heading">
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
            <li className="rounded-xl bg-background p-3" key={signal.ruleKey}>
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
    <SectionCard title="Candidate history" className="p-0">
      <div className="border-b border-border p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Candidate history</h2>
        <p className="mt-1 text-sm text-muted-foreground">Saved evaluations stay here so you can compare and revisit them.</p>
      </div>
      <div className="divide-y divide-border">
        {candidates.map((candidate) => (
          <button
            className={cn(
              "grid w-full gap-3 p-5 text-left transition hover:bg-muted/50 md:grid-cols-[minmax(0,1fr)_auto] sm:p-6",
              candidate.id === selectedId ? "bg-muted/60" : "bg-card",
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
    </SectionCard>
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
    <div className="rounded-2xl border border-border bg-muted/40 p-4">
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
