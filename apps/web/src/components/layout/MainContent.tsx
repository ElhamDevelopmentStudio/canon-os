import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function MainContent({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main className={cn("min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-8", className)} id="main-content">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">{children}</div>
    </main>
  );
}
