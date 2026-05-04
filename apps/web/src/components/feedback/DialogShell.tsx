import { type ReactNode, type RefObject, useRef } from "react";

import { useDialogFocus } from "@/hooks/useDialogFocus";
import { cn } from "@/lib/utils";

export function DialogShell({
  children,
  className,
  closeOnEscape = true,
  descriptionId,
  initialFocusRef,
  label,
  labelledBy,
  onClose,
  open = true,
  panelClassName,
}: {
  children: ReactNode;
  className?: string;
  closeOnEscape?: boolean;
  descriptionId?: string;
  initialFocusRef?: RefObject<HTMLElement>;
  label?: string;
  labelledBy?: string;
  onClose?: () => void;
  open?: boolean;
  panelClassName?: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(dialogRef, { closeOnEscape, initialFocusRef, onClose, open });

  if (!open) return null;

  return (
    <div
      aria-describedby={descriptionId}
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      aria-modal="true"
      className={cn("fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm", className)}
      ref={dialogRef}
      role="dialog"
      tabIndex={-1}
    >
      <div className={cn("w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl", panelClassName)}>
        {children}
      </div>
    </div>
  );
}
