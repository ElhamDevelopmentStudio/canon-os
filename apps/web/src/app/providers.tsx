import { SWRConfig } from "swr";
import type { PropsWithChildren } from "react";

import { ToastProvider } from "@/components/feedback/ToastProvider";
import { useToast } from "@/components/feedback/toastContext";
import { fetcher } from "@/lib/swr";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ToastProvider>
      <SWRWithToasts>{children}</SWRWithToasts>
    </ToastProvider>
  );
}

function SWRWithToasts({ children }: PropsWithChildren) {
  const { notify } = useToast();

  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false,
        shouldRetryOnError: false,
        onError: (error) => {
          const message = error instanceof Error ? error.message : "The request failed.";
          notify({ title: "API request failed", message, tone: "error" });
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
