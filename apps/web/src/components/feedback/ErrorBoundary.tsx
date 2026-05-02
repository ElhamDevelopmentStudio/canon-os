import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";

import { ErrorState } from "@/components/feedback/ErrorState";

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("CanonOS UI error", error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="min-h-screen bg-background p-6 text-foreground">
          <ErrorState
            title="CanonOS hit a screen error"
            message="Refresh the page and try again. If this keeps happening, check the browser console for the captured error."
            retryLabel="Reload page"
            onRetry={() => window.location.reload()}
          />
        </main>
      );
    }

    return this.props.children;
  }
}
