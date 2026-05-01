import { cn } from "@/lib/utils";

const scoreClasses = {
  excellent: "border-excellent/30 bg-excellent/10 text-excellent",
  promising: "border-promising/30 bg-promising/10 text-promising",
  risky: "border-risky/30 bg-risky/10 text-risky",
  avoid: "border-avoid/30 bg-avoid/10 text-avoid",
  unknown: "border-unknown/30 bg-unknown/10 text-unknown",
};

export type ScoreTone = keyof typeof scoreClasses;

export function ScoreBadge({ score, label, tone = "unknown" }: { score?: number; label?: string; tone?: ScoreTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
        scoreClasses[tone],
      )}
    >
      {score === undefined ? "—" : score.toFixed(1)}
      {label ? <span className="font-medium opacity-80">{label}</span> : null}
    </span>
  );
}
