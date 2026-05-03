import type { CouncilSession, CriticOpinion, CriticPersona } from "@canonos/contracts";
import { MessageSquare, RotateCcw, Save, Settings2, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ScoreBadge } from "@/components/data-display/ScoreBadge";
import { StatusPill } from "@/components/data-display/StatusPill";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { PageSubtitle, PageTitle } from "@/components/layout/PageText";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { useCandidates } from "@/features/candidate-evaluator/candidateApi";
import {
  applyCouncilDecisionToCandidate,
  createCouncilSession,
  resetCriticPersonas,
  updateCriticPersona,
  useCouncilSessions,
  useCriticPersonas,
} from "@/features/critic-council/councilApi";
import {
  councilDecisionLabels,
  councilDecisionTone,
  criticPersonaRoleLabels,
} from "@/features/critic-council/councilLabels";
import { useMediaItems } from "@/features/media/mediaApi";
import { mediaTypeLabels } from "@/features/media/mediaLabels";
import { cn } from "@/lib/utils";

export function CriticCouncilPage() {
  const { data: personasData, error: personasError, isLoading: personasLoading, mutate: mutatePersonas } = useCriticPersonas();
  const { data: sessionsData, error: sessionsError, isLoading: sessionsLoading, mutate: mutateSessions } = useCouncilSessions();
  const { data: candidatesData } = useCandidates();
  const { data: mediaData } = useMediaItems();
  const [prompt, setPrompt] = useState("");
  const [candidateId, setCandidateId] = useState("");
  const [mediaItemId, setMediaItemId] = useState("");
  const [activeSession, setActiveSession] = useState<CouncilSession | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const personas = personasData?.results ?? [];
  const sessions = sessionsData?.results ?? [];
  const candidates = useMemo(() => candidatesData?.results ?? [], [candidatesData]);
  const mediaItems = useMemo(() => mediaData?.results ?? [], [mediaData]);
  const selectedSession = activeSession ?? sessions[0] ?? null;

  async function runCouncil() {
    setFormError(null);
    setMessage(null);
    if (!prompt.trim() && !candidateId && !mediaItemId) {
      setFormError("Add a prompt, candidate, or media item before running Critic Council.");
      return;
    }
    setIsRunning(true);
    try {
      const session = await createCouncilSession({
        prompt: prompt.trim(),
        candidateId: candidateId || null,
        mediaItemId: mediaItemId || null,
      });
      setActiveSession(session);
      await mutateSessions();
      setMessage("Critic Council finished its debate.");
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Could not run Critic Council.");
    } finally {
      setIsRunning(false);
    }
  }

  async function applyDecision() {
    if (!selectedSession?.candidateId) return;
    setFormError(null);
    setMessage(null);
    setIsApplying(true);
    try {
      const response = await applyCouncilDecisionToCandidate(selectedSession.id);
      setActiveSession(response.session);
      await mutateSessions();
      setMessage(`Candidate marked as ${response.session.finalDecision.label}.`);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Could not apply council decision.");
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <PageTitle>Critic Council</PageTitle>
          <PageSubtitle>
            Run multiple critic personas against a candidate, media item, or freeform decision prompt without changing the underlying score.
          </PageSubtitle>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)]">
        <SectionCard title="Council prompt">
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                <UsersRound aria-hidden="true" className="h-5 w-5 text-primary" />
                Council prompt
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Select a saved candidate or media item, add live context, and ask the council for a bounded decision.
              </p>
            </div>

            <label className="grid gap-1.5 text-sm font-medium">
              Council prompt / context
              <textarea
                className={cn(fieldClassName, "min-h-28 resize-y py-3")}
                placeholder="Example: I want something worthwhile tonight, but I am tired and do not want generic prestige packaging."
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium">
                Candidate
                <select className={fieldClassName} value={candidateId} onChange={(event) => setCandidateId(event.target.value)}>
                  <option value="">No candidate selected</option>
                  {candidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.title} · {mediaTypeLabels[candidate.mediaType]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Media item
                <select className={fieldClassName} value={mediaItemId} onChange={(event) => setMediaItemId(event.target.value)}>
                  <option value="">No media item selected</option>
                  {mediaItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title} · {mediaTypeLabels[item.mediaType]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button disabled={isRunning} type="button" onClick={() => void runCouncil()}>
                <MessageSquare aria-hidden="true" className="mr-2 h-4 w-4" />
                {isRunning ? "Running Council..." : "Run Council"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setPrompt("");
                  setCandidateId("");
                  setMediaItemId("");
                  setActiveSession(null);
                  setFormError(null);
                  setMessage(null);
                }}
              >
                <RotateCcw aria-hidden="true" className="mr-2 h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>
        </SectionCard>

        <div className="flex flex-col gap-6">
          {formError ? <ErrorState title="Critic Council failed" message={formError} /> : null}
          {message ? <SuccessMessage message={message} /> : null}
          <CouncilFinalDecisionCard
            isApplying={isApplying}
            session={selectedSession}
            onApply={() => void applyDecision()}
          />
        </div>
      </div>

      {personasLoading ? <LoadingState title="Loading critic personas" message="Fetching council roles and settings." /> : null}
      {personasError ? <ErrorState title="Critic personas unavailable" message={personasError.message} onRetry={() => void mutatePersonas()} /> : null}
      {!personasLoading && !personasError ? <CriticSettingsSection personas={personas} onRefresh={() => void mutatePersonas()} /> : null}

      {selectedSession ? <CouncilOpinionGrid opinions={selectedSession.criticOpinions} /> : null}

      {sessionsLoading ? <LoadingState title="Loading council history" message="Fetching previous council sessions." /> : null}
      {sessionsError ? <ErrorState title="Council history unavailable" message={sessionsError.message} onRetry={() => void mutateSessions()} /> : null}
      {!sessionsLoading && !sessionsError && sessions.length === 0 ? (
        <EmptyState title="No council sessions yet" message="Run the council on a candidate, media item, or prompt to save its first debate." />
      ) : null}
      {!sessionsLoading && !sessionsError && sessions.length > 0 ? (
        <CouncilHistory sessions={sessions} selectedId={selectedSession?.id} onSelect={setActiveSession} />
      ) : null}
    </div>
  );
}

function CouncilFinalDecisionCard({
  isApplying,
  session,
  onApply,
}: {
  isApplying: boolean;
  session: CouncilSession | null;
  onApply: () => void;
}) {
  if (!session) {
    return (
      <SectionCard title="Final council decision">
        <div className="rounded-2xl border border-dashed border-border p-6 text-center">
          <h2 className="text-lg font-semibold">No council decision yet</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Run the council to see critic disagreement, a synthesized decision, and candidate action controls.
          </p>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Final council decision">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Final decision</p>
            <h2 className="mt-1 text-2xl font-semibold">{session.finalDecision.label}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {session.candidateTitle ?? session.mediaItemTitle ?? "Freeform council prompt"}
            </p>
          </div>
          <StatusPill
            label={councilDecisionLabels[session.finalDecision.decision]}
            tone={councilDecisionTone[session.finalDecision.decision]}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Metric label="Confidence" score={session.finalDecision.confidenceScore} tone="promising" />
          <Metric label="Disagreement" score={session.finalDecision.disagreementScore} tone="risky" />
        </div>

        <p className="rounded-2xl bg-muted/60 p-4 text-sm leading-6 text-muted-foreground">
          {session.finalDecision.explanation}
        </p>

        {session.candidateId ? (
          <Button disabled={isApplying || session.finalDecision.appliedToCandidate} type="button" onClick={onApply}>
            <Save aria-hidden="true" className="mr-2 h-4 w-4" />
            {session.finalDecision.appliedToCandidate
              ? "Decision Added To Candidate"
              : isApplying
                ? "Adding..."
                : "Add Decision To Candidate"}
          </Button>
        ) : null}
      </div>
    </SectionCard>
  );
}

function CriticSettingsSection({ personas, onRefresh }: { personas: CriticPersona[]; onRefresh: () => void }) {
  const [drafts, setDrafts] = useState<Record<string, { isEnabled: boolean; weight: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDrafts((current) => {
      if (Object.keys(current).length > 0) return current;
      return Object.fromEntries(
        personas.map((persona) => [persona.id, { isEnabled: persona.isEnabled, weight: String(persona.weight) }]),
      );
    });
  }, [personas]);

  function updateDraft(id: string, next: Partial<{ isEnabled: boolean; weight: string }>) {
    setDrafts((current) => ({
      ...current,
      [id]: { ...(current[id] ?? { isEnabled: true, weight: "10" }), ...next },
    }));
    setMessage(null);
    setError(null);
  }

  async function savePersona(persona: CriticPersona) {
    const draft = drafts[persona.id];
    if (!draft) return;
    setSavingId(persona.id);
    setMessage(null);
    setError(null);
    try {
      const saved = await updateCriticPersona(persona.id, {
        isEnabled: draft.isEnabled,
        weight: Number(draft.weight),
      });
      setDrafts((current) => ({ ...current, [persona.id]: { isEnabled: saved.isEnabled, weight: String(saved.weight) } }));
      setMessage(`Saved ${saved.name}. Re-run the council to apply this setting.`);
      onRefresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save critic persona.");
    } finally {
      setSavingId(null);
    }
  }

  async function resetPersonas() {
    setIsResetting(true);
    setMessage(null);
    setError(null);
    try {
      const reset = await resetCriticPersonas();
      setDrafts(Object.fromEntries(reset.map((persona) => [persona.id, { isEnabled: persona.isEnabled, weight: String(persona.weight) }])));
      setMessage("Critic personas reset to CanonOS defaults.");
      onRefresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not reset critic personas.");
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <SectionCard title="Critic settings">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Settings2 aria-hidden="true" className="h-5 w-5 text-primary" />
            Critic settings
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Enable, hide, or weight each critic. Disabled critics are omitted from the next debate.
          </p>
        </div>
        <Button disabled={isResetting} type="button" variant="secondary" onClick={() => void resetPersonas()}>
          {isResetting ? "Resetting..." : "Reset Personas"}
        </Button>
      </div>

      {error ? <ErrorState title="Critic setting failed" message={error} /> : null}
      {message ? <SuccessMessage message={message} /> : null}

      <div className="mt-5 grid gap-3">
        {personas.map((persona) => {
          const draft = drafts[persona.id] ?? { isEnabled: persona.isEnabled, weight: String(persona.weight) };
          return (
            <article className="rounded-2xl border border-border bg-background p-4" key={persona.id}>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_9rem_8rem_auto] lg:items-center">
                <div>
                  <h3 className="font-semibold">{criticPersonaRoleLabels[persona.role]}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{persona.description}</p>
                </div>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    checked={draft.isEnabled}
                    type="checkbox"
                    onChange={(event) => updateDraft(persona.id, { isEnabled: event.target.checked })}
                  />
                  Enabled
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  Weight
                  <input
                    className={fieldClassName}
                    max={100}
                    min={0}
                    type="number"
                    value={draft.weight}
                    onChange={(event) => updateDraft(persona.id, { weight: event.target.value })}
                  />
                </label>
                <Button disabled={savingId === persona.id} type="button" onClick={() => void savePersona(persona)}>
                  {savingId === persona.id ? "Saving..." : "Save Critic"}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </SectionCard>
  );
}

function CouncilOpinionGrid({ opinions }: { opinions: CriticOpinion[] }) {
  return (
    <SectionCard title="Critic opinions">
      <h2 className="text-xl font-semibold">Critic opinions</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Each critic reads the same score/context and produces a short perspective. These explain, but do not replace, the final score.
      </p>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {opinions.map((opinion) => (
          <article className="rounded-2xl border border-border bg-background p-4" key={opinion.personaId}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{criticPersonaRoleLabels[opinion.role]}</h3>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {opinion.stance} · weight {opinion.weight}
                </p>
              </div>
              <ScoreBadge score={opinion.confidence} label="confidence" tone="promising" />
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{opinion.argument}</p>
            <div className="mt-4 rounded-xl bg-muted/60 p-3 text-sm">
              <span className="font-semibold">Recommendation:</span> {opinion.recommendationLabel}
            </div>
            {opinion.evidence.length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
                {opinion.evidence.map((item) => <li key={item}>{item}</li>)}
              </ul>
            ) : null}
          </article>
        ))}
      </div>
    </SectionCard>
  );
}

function CouncilHistory({
  sessions,
  selectedId,
  onSelect,
}: {
  sessions: CouncilSession[];
  selectedId?: string;
  onSelect: (session: CouncilSession) => void;
}) {
  return (
    <SectionCard title="Council history" className="p-0">
      <div className="border-b border-border p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Council history</h2>
        <p className="mt-1 text-sm text-muted-foreground">Saved debates remain available for candidate and media decisions.</p>
      </div>
      <div className="divide-y divide-border">
        {sessions.map((session) => (
          <button
            className={cn(
              "grid w-full gap-3 p-5 text-left transition hover:bg-muted/50 md:grid-cols-[minmax(0,1fr)_auto] sm:p-6",
              session.id === selectedId ? "bg-muted/60" : "bg-card",
            )}
            key={session.id}
            type="button"
            onClick={() => onSelect(session)}
          >
            <span>
              <span className="font-semibold">{session.candidateTitle ?? session.mediaItemTitle ?? "Freeform council"}</span>
              <span className="mt-2 block text-sm text-muted-foreground">{session.finalDecision.explanation}</span>
            </span>
            <span className="flex flex-wrap items-center gap-2 md:justify-end">
              <StatusPill label={session.finalDecision.label} tone={councilDecisionTone[session.finalDecision.decision]} />
              <ScoreBadge score={session.finalDecision.disagreementScore} label="disagreement" tone="risky" />
            </span>
          </button>
        ))}
      </div>
    </SectionCard>
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

function SuccessMessage({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-promising/30 bg-promising/10 p-4 text-sm font-medium text-promising" role="status">
      {message}
    </div>
  );
}

const fieldClassName = cn(
  "h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary",
);
