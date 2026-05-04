import { cn } from "@/lib/utils";

const scoreClasses = {
  excellent: "border-excellent/35 bg-excellent/10 text-excellent",
  promising: "border-promising/35 bg-promising/10 text-promising",
  risky: "border-risky/35 bg-risky/10 text-risky",
  avoid: "border-avoid/35 bg-avoid/10 text-avoid",
  unknown: "border-unknown/35 bg-unknown/10 text-unknown",
};

export type ScoreTone = keyof typeof scoreClasses;

const toneLabels: Record<ScoreTone, string> = {
  excellent: "excellent",
  promising: "promising",
  risky: "risky",
  avoid: "avoid",
  unknown: "unknown",
};

export function ScoreBadge({ score, label, tone = "unknown" }: { score?: number; label?: string; tone?: ScoreTone }) {
  const scoreText = score === undefined ? "No score" : `${score.toFixed(1)} score`;
  const accessibleLabel = label
    ? `${label}: ${scoreText}, ${toneLabels[tone]} signal`
    : `${scoreText}, ${toneLabels[tone]} signal`;

  return (
    <span
      aria-label={accessibleLabel}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm",
        scoreClasses[tone],
      )}
      title={accessibleLabel}
    >
      <span className="tabular-nums">{score === undefined ? "—" : score.toFixed(1)}</span>
      {label ? <span className="font-medium opacity-85">{label}</span> : null}
      <span className="sr-only"> {toneLabels[tone]} signal</span>
    </span>
  );
}
