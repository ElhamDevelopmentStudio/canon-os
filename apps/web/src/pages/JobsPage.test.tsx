import type { BackgroundJob } from "@canonos/contracts";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { useBackgroundJobs } from "@/features/jobs/jobsApi";
import { JobsPage } from "@/pages/JobsPage";

vi.mock("@/features/jobs/jobsApi", () => ({
  useBackgroundJobs: vi.fn(),
}));

const jobs: BackgroundJob[] = [
  {
    id: "2ea0298f-3d8d-4a60-95f3-d02b0fa6a2cc",
    jobType: "graph_rebuild",
    status: "complete",
    progressTotal: 1,
    progressProcessed: 1,
    progressPercent: 100,
    message: "TasteGraph rebuilt from media evidence.",
    result: { nodeCount: 4, edgeCount: 6 },
    sourceId: "6e8998f5-7b7b-4cab-87b9-7a6daa17b4c2",
    sourceLabel: "TasteGraph rebuild",
    createdAt: "2026-05-04T10:00:00Z",
    completedAt: "2026-05-04T10:00:01Z",
  },
  {
    id: "04a5a180-e296-48cb-bcf0-9ad7f8187b36",
    jobType: "export",
    status: "processing",
    progressTotal: 10,
    progressProcessed: 5,
    progressPercent: 50,
    message: "Exporting records.",
    result: { format: "json" },
    sourceId: "6a9a249e-c7e2-46ea-9e37-b99b59315c88",
    sourceLabel: "Full JSON backup",
    createdAt: "2026-05-04T10:02:00Z",
    completedAt: null,
  },
];

describe("JobsPage", () => {
  it("renders recent jobs with status, progress, and result details", () => {
    vi.mocked(useBackgroundJobs).mockReturnValue({
      data: jobs,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useBackgroundJobs>);

    render(<JobsPage />);

    expect(screen.getByRole("heading", { name: "Background jobs" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recent jobs" })).toBeInTheDocument();
    expect(screen.getByText("TasteGraph rebuild")).toBeInTheDocument();
    expect(screen.getByText("Full JSON backup")).toBeInTheDocument();
    expect(screen.getByText("Complete")).toBeInTheDocument();
    expect(screen.getByText("Running")).toBeInTheDocument();
    expect(screen.getByText("1/1 • 100%")).toBeInTheDocument();
    expect(screen.getByText("5/10 • 50%")).toBeInTheDocument();
    expect(screen.getByText("node Count")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("shows an empty state and supports manual refresh", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    vi.mocked(useBackgroundJobs).mockReturnValue({
      data: [],
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate,
    } as unknown as ReturnType<typeof useBackgroundJobs>);

    render(<JobsPage />);

    expect(screen.getByText("No background jobs yet")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Refresh jobs" }));
    expect(mutate).toHaveBeenCalled();
  });

  it("shows loading and error states", () => {
    const mutate = vi.fn();
    vi.mocked(useBackgroundJobs).mockReturnValue({
      data: undefined,
      error: new Error("Jobs API failed"),
      isLoading: false,
      isValidating: false,
      mutate,
    } as unknown as ReturnType<typeof useBackgroundJobs>);

    render(<JobsPage />);

    const alert = screen.getByRole("alert");
    expect(within(alert).getByText("Background jobs unavailable")).toBeInTheDocument();
    expect(within(alert).getByText("Jobs API failed")).toBeInTheDocument();
  });
});
