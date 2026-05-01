import { cn } from "@/lib/utils";

const toneClasses = {
  neutral: "border-border bg-muted text-muted-foreground",
  active: "border-primary/30 bg-primary/10 text-primary",
  success: "border-promising/30 bg-promising/10 text-promising",
  warning: "border-risky/30 bg-risky/10 text-risky",
  danger: "border-avoid/30 bg-avoid/10 text-avoid",
};

export type StatusTone = keyof typeof toneClasses;

export function StatusPill({ label, tone = "neutral" }: { label: string; tone?: StatusTone }) {
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", toneClasses[tone])}>
      {label}
    </span>
  );
}
