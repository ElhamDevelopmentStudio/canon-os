import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function FormFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mt-6 flex flex-wrap items-center justify-end gap-3", className)}>
      {children}
    </div>
  );
}
