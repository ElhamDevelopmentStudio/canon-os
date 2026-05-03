import type { UnifiedSearchResult, UnifiedSearchResultType } from "@canonos/contracts";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Button } from "@/components/ui/button";
import { useUnifiedSearch } from "@/features/search/searchApi";
import { cn } from "@/lib/utils";

const resultTypeLabels: Record<UnifiedSearchResultType, string> = {
  media: "Media",
  candidate: "Candidate",
  queue_item: "Queue",
  canon_season: "Canon season",
};

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { data, error, isLoading } = useUnifiedSearch(query, 5);
  const results = useMemo(() => data?.results ?? [], [data]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const timeout = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  function openResult(result: UnifiedSearchResult) {
    navigate(result.targetUrl);
    onClose();
  }

  return (
    <div
      aria-labelledby="command-palette-title"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-foreground/40 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <div className="mx-auto mt-16 w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search aria-hidden="true" className="h-5 w-5 text-muted-foreground" />
          <label className="sr-only" htmlFor="global-command-search">Global search</label>
          <input
            aria-describedby="command-palette-help"
            className="h-11 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            id="global-command-search"
            placeholder="Search media, candidates, queue, or canon seasons…"
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button aria-label="Close command palette" size="sm" type="button" variant="ghost" onClick={onClose}>
            <X aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>

        <div className="border-b border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground" id="command-palette-help">
          <h2 className="sr-only" id="command-palette-title">Command palette</h2>
          Press Ctrl+K or ⌘K anywhere to reopen. Select a result to navigate.
        </div>

        <div className="max-h-[28rem] overflow-y-auto p-3">
          {query.trim().length < 2 ? (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Type at least two characters to search your CanonOS workspace.
            </div>
          ) : null}
          {isLoading ? <LoadingState title="Searching CanonOS" message="Checking library, candidates, queue, and canon seasons." /> : null}
          {error ? <ErrorState title="Search unavailable" message={error.message} /> : null}
          {!isLoading && !error && query.trim().length >= 2 && results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No matching media, candidates, queue items, or canon seasons.
            </div>
          ) : null}
          {!isLoading && !error && results.length > 0 ? (
            <ul className="grid gap-2" aria-label="Search results">
              {results.map((result) => (
                <li key={`${result.type}-${result.id}`}>
                  <button
                    className={cn(
                      "w-full rounded-2xl border border-border bg-background p-4 text-left transition",
                      "hover:border-primary hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary",
                    )}
                    type="button"
                    onClick={() => openResult(result)}
                  >
                    <span className="flex flex-wrap items-start justify-between gap-3">
                      <span>
                        <span className="block font-semibold text-foreground">{result.title}</span>
                        <span className="mt-1 block text-sm text-muted-foreground">{result.description || "No extra details"}</span>
                      </span>
                      <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                        {resultTypeLabels[result.type]}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
