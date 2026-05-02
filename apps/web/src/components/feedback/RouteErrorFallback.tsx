import { isRouteErrorResponse, useRouteError } from "react-router-dom";

import { ErrorState } from "@/components/feedback/ErrorState";

export function RouteErrorFallback() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? error.statusText || `Route failed with status ${error.status}.`
    : error instanceof Error
      ? error.message
      : "This route could not be rendered.";

  return (
    <main className="min-h-screen bg-background p-6 text-foreground">
      <ErrorState title="Page unavailable" message={message} />
    </main>
  );
}
