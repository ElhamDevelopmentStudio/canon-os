import type { CouncilSession, CriticOpinion, CriticPersona, MediaType } from "@canonos/contracts";
import { History, MessageSquare, RotateCcw, Save, Settings2, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ScoreBadge } from "@/components/data-display/ScoreBadge";
import { StatusPill } from "@/components/data-display/StatusPill";
import { DialogShell } from "@/components/feedback/DialogShell";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
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
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const personas = personasData?.results ?? [];
  const sessions = sessionsData?.results ?? [];
  const candidates = useMemo(() => candidatesData?.results ?? [], [candidatesData]);
  const mediaItems = useMemo(() => mediaData?.results ?? [], [mediaData]);
  const selectedSession = activeSession ?? sessions[0] ?? null;
  const enabledPersonaCount = personas.filter((persona) => persona.isEnabled).length;

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
    <div className="flex flex-col gap-5">
      <section className="grid gap-4 border-b border-border pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Debate desk</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Critic Council</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Run weighted critic personas against a candidate, media item, or decision prompt.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsSettingsOpen(true)}>
              <Settings2 aria-hidden="true" className="mr-2 h-4 w-4" />
              Critic Settings
            </Button>
            <Button type="button" variant="secondary" onClick={() => setIsHistoryOpen(true)}>
              <History aria-hidden="true" className="mr-2 h-4 w-4" />
              History{sessionsData?.count ? ` (${sessionsData.count})` : ""}
            </Button>
          </div>
        </div>
        <CouncilSignalStrip
          enabledPersonaCount={enabledPersonaCount}
          personaCount={personas.length}
          selectedSession={selectedSession}
          sessionCount={sessionsData?.count ?? sessions.length}
        />
      </section>

      <div className="grid min-h-[34rem] gap-6 xl:grid-cols-[minmax(28rem,0.85fr)_minmax(34rem,1.15fr)]">
        <CouncilPromptPanel
          candidateId={candidateId}
          candidates={candidates}
          isRunning={isRunning}
          mediaItemId={mediaItemId}
          mediaItems={mediaItems}
          prompt={prompt}
          onCandidateChange={setCandidateId}
          onMediaItemChange={setMediaItemId}
          onPromptChange={setPrompt}
          onReset={() => {
            setPrompt("");
            setCandidateId("");
            setMediaItemId("");
            setActiveSession(null);
            setFormError(null);
            setMessage(null);
          }}
          onRun={() => void runCouncil()}
        />

        <div className="flex flex-col gap-6">
          {formError ? <ErrorState title="Critic Council failed" message={formError} /> : null}
          {message ? <SuccessMessage message={message} /> : null}
          <CouncilFinalDecisionCard
            isApplying={isApplying}
            session={selectedSession}
            onApply={() => void applyDecision()}
          />
          {selectedSession ? <CouncilOpinionGrid opinions={selectedSession.criticOpinions} /> : null}
        </div>
      </div>

      {isSettingsOpen ? (
        <CriticSettingsDialog
          error={personasError}
          isLoading={personasLoading}
          personas={personas}
          onClose={() => setIsSettingsOpen(false)}
          onRefresh={() => void mutatePersonas()}
          onRetry={() => void mutatePersonas()}
        />
      ) : null}

      {isHistoryOpen ? (
        <CouncilHistoryDialog
          error={sessionsError}
          isLoading={sessionsLoading}
          selectedId={selectedSession?.id}
          sessions={sessions}
          onClose={() => setIsHistoryOpen(false)}
          onRetry={() => void mutateSessions()}
          onSelect={(session) => {
            setActiveSession(session);
            setIsHistoryOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function CouncilSignalStrip({
  enabledPersonaCount,
  personaCount,
  selectedSession,
  sessionCount,
}: {
  enabledPersonaCount: number;
  personaCount: number;
  selectedSession: CouncilSession | null;
  sessionCount: number;
}) {
  return (
    <section aria-label="Council signals" className="grid gap-2 md:grid-cols-4">
      <SignalStat label="Critics active" value={`${enabledPersonaCount}/${personaCount || 0}`} />
      <SignalStat label="Saved debates" value={String(sessionCount)} />
      <SignalStat label="Confidence" value={selectedSession ? `${selectedSession.finalDecision.confidenceScore}/100` : "Pending"} />
      <SignalStat label="Disagreement" value={selectedSession ? `${selectedSession.finalDecision.disagreementScore}/100` : "Pending"} />
    </section>
  );
}

function SignalStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l-4 border-primary bg-muted/35 px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function CouncilPromptPanel({
  candidateId,
  candidates,
  isRunning,
  mediaItemId,
  mediaItems,
  prompt,
  onCandidateChange,
  onMediaItemChange,
  onPromptChange,
  onReset,
  onRun,
}: {
  candidateId: string;
  candidates: Array<{ id: string; title: string; mediaType: MediaType }>;
  isRunning: boolean;
  mediaItemId: string;
  mediaItems: Array<{ id: string; title: string; mediaType: MediaType }>;
  prompt: string;
  onCandidateChange: (value: string) => void;
  onMediaItemChange: (value: string) => void;
  onPromptChange: (value: string) => void;
  onReset: () => void;
  onRun: () => void;
}) {
  return (
    <section aria-label="Council prompt" className="grid content-start gap-4 border-r border-border pr-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <UsersRound aria-hidden="true" className="h-5 w-5 text-primary" />
            Run debate
          </h2>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Decision prompt</span>
        </div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Select a target, add context, and ask for a bounded decision.
        </p>
      </div>

      <label className="grid gap-1.5 text-sm font-medium">
        Council prompt / context
        <textarea
          className={cn(fieldClassName, "min-h-32 resize-y py-3 leading-6")}
          placeholder="Example: I want something worthwhile tonight, but I am tired and do not want generic prestige packaging."
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
        />
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium">
          Candidate
          <select className={fieldClassName} value={candidateId} onChange={(event) => onCandidateChange(event.target.value)}>
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
          <select className={fieldClassName} value={mediaItemId} onChange={(event) => onMediaItemChange(event.target.value)}>
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
        <Button disabled={isRunning} type="button" onClick={onRun}>
          <MessageSquare aria-hidden="true" className="mr-2 h-4 w-4" />
          {isRunning ? "Running Council..." : "Run Council"}
        </Button>
        <Button type="button" variant="secondary" onClick={onReset}>
          <RotateCcw aria-hidden="true" className="mr-2 h-4 w-4" />
          Reset
        </Button>
      </div>
    </section>
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
      <section aria-label="Final council decision" className="border-l border-border pl-6">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Final council decision</p>
        <h2 className="mt-4 text-2xl font-semibold">No decision yet</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Run the council to see critic disagreement, a synthesized decision, and candidate action controls.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Final council decision" className="border-l border-border pl-6">
      <div className="grid gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Final decision</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">{session.finalDecision.label}</h2>
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

        <p className="border-l border-border pl-4 text-sm leading-6 text-muted-foreground">
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
    </section>
  );
}

function CriticSettingsDialog({
  error,
  isLoading,
  personas,
  onClose,
  onRefresh,
  onRetry,
}: {
  error: Error | undefined;
  isLoading: boolean;
  personas: CriticPersona[];
  onClose: () => void;
  onRefresh: () => void;
  onRetry: () => void;
}) {
  return (
    <DialogShell labelledBy="critic-settings-title" onClose={onClose} panelClassName="max-w-5xl p-0">
      <div className="border-b border-border p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Council weights</p>
            <h2 className="mt-2 text-2xl font-semibold" id="critic-settings-title">
              Critic settings
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Enable, hide, or weight each critic for the next debate.</p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
      <div className="max-h-[70vh] overflow-y-auto p-5">
        {isLoading ? <LoadingState title="Loading critic personas" message="Fetching council roles and settings." /> : null}
        {error ? <ErrorState title="Critic personas unavailable" message={error.message} onRetry={onRetry} /> : null}
        {!isLoading && !error ? <CriticSettingsSection personas={personas} onRefresh={onRefresh} /> : null}
      </div>
    </DialogShell>
  );
}

function CouncilHistoryDialog({
  error,
  isLoading,
  selectedId,
  sessions,
  onClose,
  onRetry,
  onSelect,
}: {
  error: Error | undefined;
  isLoading: boolean;
  selectedId?: string;
  sessions: CouncilSession[];
  onClose: () => void;
  onRetry: () => void;
  onSelect: (session: CouncilSession) => void;
}) {
  return (
    <DialogShell labelledBy="council-history-title" onClose={onClose} panelClassName="max-w-5xl p-0">
      <div className="border-b border-border p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Debate log</p>
            <h2 className="mt-2 text-2xl font-semibold" id="council-history-title">
              Council history
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Reopen saved debates for candidate and media decisions.</p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
      <div className="max-h-[70vh] overflow-y-auto p-5">
        {isLoading ? <LoadingState title="Loading council history" message="Fetching previous council sessions." /> : null}
        {error ? <ErrorState title="Council history unavailable" message={error.message} onRetry={onRetry} /> : null}
        {!isLoading && !error && sessions.length === 0 ? (
          <EmptyState title="No council sessions yet" message="Run the council on a candidate, media item, or prompt to save its first debate." />
        ) : null}
        {!isLoading && !error && sessions.length > 0 ? (
          <CouncilHistory sessions={sessions} selectedId={selectedId} onSelect={onSelect} />
        ) : null}
      </div>
    </DialogShell>
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
    <section aria-label="Critic settings">
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

      <div className="mt-5 divide-y divide-border border-y border-border">
        {personas.map((persona) => {
          const draft = drafts[persona.id] ?? { isEnabled: persona.isEnabled, weight: String(persona.weight) };
          return (
            <article className="py-4" key={persona.id}>
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
    </section>
  );
}

function CouncilOpinionGrid({ opinions }: { opinions: CriticOpinion[] }) {
  return (
    <section aria-label="Critic opinions" className="border-t border-border pt-5">
      <h2 className="text-xl font-semibold">Critic opinions</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Each critic reads the same score/context and produces a short perspective. These explain, but do not replace, the final score.
      </p>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {opinions.map((opinion) => (
          <article className="border-l border-border pl-4" key={opinion.personaId}>
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
            <div className="mt-4 border-t border-border pt-3 text-sm">
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
    </section>
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
    <section aria-label="Council history">
      <div className="divide-y divide-border">
        {sessions.map((session) => (
          <button
            className={cn(
              "grid w-full gap-3 py-5 text-left transition hover:bg-muted/30 md:grid-cols-[minmax(0,1fr)_auto]",
              session.id === selectedId ? "bg-muted/40 px-4" : "",
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
    </section>
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
