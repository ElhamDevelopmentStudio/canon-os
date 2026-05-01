import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function PageTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h1 className={cn("text-3xl font-semibold tracking-tight sm:text-4xl", className)}>{children}</h1>;
}

export function PageSubtitle({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("mt-3 max-w-3xl text-base leading-7 text-muted-foreground", className)}>{children}</p>;
}
