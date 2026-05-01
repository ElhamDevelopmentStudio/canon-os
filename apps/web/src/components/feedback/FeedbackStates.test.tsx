import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";


describe("shared feedback states", () => {
  it("renders loading, empty, and error states with accessible semantics", () => {
    const retry = vi.fn();

    render(
      <>
        <LoadingState title="Loading library" message="Gathering media." />
        <EmptyState title="No media yet" message="Add a first media item." actionLabel="Add media" />
        <ErrorState title="Library unavailable" message="Could not load media." onRetry={retry} />
      </>,
    );

    expect(screen.getByRole("status")).toHaveTextContent(/loading library/i);
    expect(screen.getByText(/no media yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add media/i })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/library unavailable/i);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });
});
