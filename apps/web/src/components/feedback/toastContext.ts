import { createContext, useContext } from "react";

export type ToastTone = "success" | "error" | "info";

export type Toast = {
  id: number;
  title: string;
  message?: string;
  tone: ToastTone;
};

export type ToastContextValue = {
  notify: (toast: Omit<Toast, "id">) => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider.");
  }
  return context;
}
