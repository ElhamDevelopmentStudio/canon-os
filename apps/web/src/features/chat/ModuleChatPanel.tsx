import type { ChatModule, ChatSessionDetail } from "@canonos/contracts";
import { Bot, MessageSquare, Send, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";

import { StatusPill } from "@/components/data-display/StatusPill";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Button } from "@/components/ui/button";
import { createChatSession, sendChatMessageStream, useChatSessions } from "@/features/chat/chatApi";
import { cn } from "@/lib/utils";

const moduleLabels: Record<ChatModule, string> = {
  tonight: "Tonight chat",
  candidate: "Candidate chat",
  discovery: "Discovery chat",
  detox: "Detox chat",
  aftertaste: "Aftertaste chat",
};

const moduleIntents: Record<ChatModule, string> = {
  tonight: "Pick the best thing for this exact window.",
  candidate: "Evaluate before committing time.",
  discovery: "Generate a small deep-cut trail.",
  detox: "Decide whether to drop, pause, or continue.",
  aftertaste: "Save useful taste memory after finishing.",
};

const starterPrompts: Record<ChatModule, string[]> = {
  tonight: ["90 minutes, tired, low risk, movie or anime", "45 minutes, low focus, something light", "Deep focus and I want a surprise"],
  candidate: ['Evaluate "Severance" as a TV show', "This anime looks hyped but maybe generic", "Check a novel before I commit"],
  discovery: ["Deep-cut existential Japanese movie", "Cross-medium moral collapse, not obvious", "Modern exception anime with real authorship"],
  detox: ["I am two episodes in and motivation is 3/10", "30 minutes into a movie and I do not care", "50 pages into a novel, curiosity 5/10"],
  aftertaste: ["It was worth it, stayed 8/10, felt alive", "It felt generic and not worth the time", "Alive but only in the right mood"],
};

type ModuleChatPanelProps = {
  module: ChatModule;
  compact?: boolean;
  onResult?: (result: Record<string, unknown>) => void;
};

export function ModuleChatPanel({ module, compact = false, onResult }: ModuleChatPanelProps) {
  useChatSessions(module);
  const [session, setSession] = useState<ChatSessionDetail | null>(null);
  const activeSession = session;
  const [draft, setDraft] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [streamingStatus, setStreamingStatus] = useState("");

  async function ensureSession() {
    if (activeSession) return activeSession;
    setIsStarting(true);
    try {
      const created = await createChatSession({ module });
      setSession(created);
      return created;
    } finally {
      setIsStarting(false);
    }
  }

  async function submitMessage(content = draft) {
    const trimmed = content.trim();
    if (!trimmed) return;
    setError(null);
    setIsSending(true);
    setStreamingText("");
    setStreamingStatus("Preparing recommendation context...");
    try {
      const current = await ensureSession();
      const response = await sendChatMessageStream(
        current.id,
        { content: trimmed },
        {
          onContent: (delta) => setStreamingText((value) => `${value}${delta}`),
          onStatus: setStreamingStatus,
        },
      );
      setSession(response.session);
      setDraft("");
      onResult?.(response.result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Chat failed.");
    } finally {
      setIsSending(false);
      setStreamingText("");
      setStreamingStatus("");
    }
  }

  async function startFresh() {
    setError(null);
    setIsStarting(true);
    try {
      const created = await createChatSession({ module });
      setSession(created);
      setDraft("");
      setStreamingText("");
      setStreamingStatus("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start chat.");
    } finally {
      setIsStarting(false);
    }
  }

  const messages = activeSession?.messages ?? [];
  const latestMetadata = messages[messages.length - 1]?.metadata ?? {};
  const quickReplies: string[] = Array.isArray(latestMetadata.quickReplies)
    ? latestMetadata.quickReplies.map(String)
    : starterPrompts[module];
  const providerLabel = latestMetadata.provider === "minimax" ? "MiniMax" : latestMetadata.provider === "deterministic" ? "Local fallback" : "Ready";

  return (
    <section
      aria-label={moduleLabels[module]}
      className={cn(
        "grid min-h-0 gap-4 border border-border bg-background p-4",
        compact ? "rounded-lg" : "rounded-lg md:p-5",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <Bot aria-hidden="true" className="h-4 w-4" />
            {moduleLabels[module]}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-foreground">{moduleIntents[module]}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill label={providerLabel} tone={latestMetadata.provider === "minimax" ? "success" : "neutral"} />
          <Button disabled={isStarting || isSending} size="sm" type="button" variant="ghost" onClick={() => void startFresh()}>
            <Trash2 aria-hidden="true" className="mr-2 h-4 w-4" />
            New
          </Button>
        </div>
      </div>

      {error ? <ErrorState title="Chat unavailable" message={error} /> : null}

      <div className={cn("grid gap-3 overflow-y-auto", compact ? "max-h-80" : "max-h-[28rem]")}>
        {messages.length > 0 ? (
          <>
            {messages.map((message) => (
              <div
                className={cn(
                  "max-w-[92%] rounded-lg border px-3 py-2 text-sm leading-6",
                  message.role === "user"
                    ? "ml-auto border-primary/30 bg-primary/10 text-foreground"
                    : "mr-auto border-border bg-muted/45 text-foreground",
                )}
                key={message.id}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            ))}
            {isSending && streamingText ? (
              <div className="mr-auto max-w-[92%] rounded-lg border border-border bg-muted/45 px-3 py-2 text-sm leading-6 text-foreground">
                <p className="whitespace-pre-wrap">{streamingText}</p>
              </div>
            ) : null}
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <MessageSquare aria-hidden="true" className="h-4 w-4 text-primary" />
              Start with natural language.
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              The assistant asks for missing context first, then runs the CanonOS module instead of guessing.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {quickReplies.slice(0, 4).map((reply) => (
          <button
            className="rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-left text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            disabled={isSending || isStarting}
            key={reply}
            type="button"
            onClick={() => void submitMessage(reply)}
          >
            {reply}
          </button>
        ))}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void submitMessage();
        }}
      >
        <label className="sr-only" htmlFor={`chat-input-${module}`}>
          Message {moduleLabels[module]}
        </label>
        <input
          className="min-h-11 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
          disabled={isSending || isStarting}
          id={`chat-input-${module}`}
          placeholder="Type what you know..."
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <Button disabled={isSending || isStarting || !draft.trim()} type="submit">
          {isSending ? (
            "Sending"
          ) : (
            <>
              <Send aria-hidden="true" className="mr-2 h-4 w-4" />
              Send
            </>
          )}
        </Button>
      </form>

      {latestMetadata.providerNote ? (
        <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
          <Sparkles aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 text-primary" />
          {String(latestMetadata.providerNote)}
        </p>
      ) : null}
      {streamingStatus ? (
        <p className="text-xs leading-5 text-muted-foreground" aria-live="polite">
          {streamingStatus}
        </p>
      ) : null}
    </section>
  );
}
