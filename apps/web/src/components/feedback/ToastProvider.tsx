import { X } from "lucide-react";
import {
  useCallback,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import { ToastContext, type Toast } from "@/components/feedback/toastContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((toast: Omit<Toast, "id">) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current.slice(-2), { ...toast, id }]);
    window.setTimeout(() => dismiss(id), 5000);
  }, [dismiss]);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-label="Notifications"
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3"
        role="status"
      >
        {toasts.map((toast) => (
          <div
            className={cn(
              "rounded-2xl border bg-card p-4 shadow-xl",
              toast.tone === "error" && "border-risky/40 bg-risky/10",
              toast.tone === "success" && "border-worth/40 bg-worth/10",
              toast.tone === "info" && "border-border",
            )}
            key={toast.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground">{toast.title}</p>
                {toast.message ? (
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{toast.message}</p>
                ) : null}
              </div>
              <Button
                aria-label={`Dismiss ${toast.title}`}
                size="sm"
                type="button"
                variant="ghost"
                onClick={() => dismiss(toast.id)}
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
