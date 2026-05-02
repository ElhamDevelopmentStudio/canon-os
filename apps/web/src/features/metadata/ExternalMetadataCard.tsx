import type { ExternalMediaMatch } from "@canonos/contracts";

import { Button } from "@/components/ui/button";
import { externalProviderLabels } from "@/features/metadata/metadataLabels";

export function ExternalMetadataCard({
  match,
  isAttaching = false,
  onAttach,
  onUse,
}: {
  match: ExternalMediaMatch;
  isAttaching?: boolean;
  onAttach?: (match: ExternalMediaMatch) => void;
  onUse?: (match: ExternalMediaMatch) => void;
}) {
  return (
    <article className="grid gap-3 rounded-2xl border border-border bg-background p-4 sm:grid-cols-[80px_1fr]">
      {match.imageUrl ? (
        <img
          alt={`Poster for ${match.title}`}
          className="h-28 w-20 rounded-xl object-cover"
          src={match.imageUrl}
        />
      ) : (
        <div className="flex h-28 w-20 items-center justify-center rounded-xl bg-muted text-xs text-muted-foreground">
          No image
        </div>
      )}
      <div className="grid gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {externalProviderLabels[match.provider]} · {Math.round(match.confidence * 100)}% confidence
          </p>
          <h4 className="font-semibold text-foreground">{match.title}</h4>
          <p className="text-sm text-muted-foreground">
            {[match.creator, match.releaseYear].filter(Boolean).join(" · ") || "Creator/year unknown"}
          </p>
        </div>
        <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{match.description}</p>
        <div className="flex flex-wrap gap-2">
          {onUse ? (
            <Button type="button" variant="secondary" onClick={() => onUse(match)}>
              Use metadata
            </Button>
          ) : null}
          {onAttach ? (
            <Button disabled={isAttaching} type="button" onClick={() => onAttach(match)}>
              {isAttaching ? "Attaching…" : "Attach metadata"}
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
