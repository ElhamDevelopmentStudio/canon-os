import { Film, Headphones, LibraryBig, MonitorPlay, Tv } from "lucide-react";

import { cn } from "@/lib/utils";

const mediaIcon = {
  movie: Film,
  tv_show: Tv,
  anime: MonitorPlay,
  novel: LibraryBig,
  audiobook: Headphones,
};

export type MediaType = keyof typeof mediaIcon;

export function MediaTypeBadge({ type, label, className }: { type: MediaType; label?: string; className?: string }) {
  const Icon = mediaIcon[type];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {label ?? type.replace("_", " ")}
    </span>
  );
}
