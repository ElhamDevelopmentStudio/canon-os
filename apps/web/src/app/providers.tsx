import { SWRConfig } from "swr";
import type { PropsWithChildren } from "react";

import { fetcher } from "@/lib/swr";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false,
        shouldRetryOnError: false,
      }}
    >
      {children}
    </SWRConfig>
  );
}
