import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function SectionCard({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <section
      aria-label={title}
      className={cn("rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6", className)}
    >
      {children}
    </section>
  );
}
