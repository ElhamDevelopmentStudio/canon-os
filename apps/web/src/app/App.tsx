import { useMemo } from "react";
import { RouterProvider } from "react-router-dom";

import { AppProviders } from "@/app/providers";
import { createAppRouter } from "@/app/router";
import { ErrorBoundary } from "@/components/feedback/ErrorBoundary";

export function App() {
  const router = useMemo(() => createAppRouter(), []);

  return (
    <ErrorBoundary>
      <AppProviders>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </AppProviders>
    </ErrorBoundary>
  );
}
