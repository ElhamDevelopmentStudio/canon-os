import type { BackgroundJob } from "@canonos/contracts";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { useBackgroundJobs } from "@/features/jobs/jobsApi";
import { NotificationsDropdown } from "@/features/jobs/NotificationsDropdown";

vi.mock("@/features/jobs/jobsApi", () => ({
  useBackgroundJobs: vi.fn(),
}));

const recentJobs: BackgroundJob[] = [
  {
    id: "04a5a180-e296-48cb-bcf0-9ad7f8187b36",
    jobType: "narrative_analysis",
    status: "complete",
    progressTotal: 1,
    progressProcessed: 1,
    progressPercent: 100,
    message: "Narrative DNA analysis complete.",
    result: { confidenceScore: 74 },
    sourceId: "7ffb242b-c376-43e6-bbb0-057534a6e01d",
    sourceLabel: "Narrative DNA: Perfect Blue",
    createdAt: "2026-05-04T10:02:00Z",
    completedAt: "2026-05-04T10:02:01Z",
  },
];

describe("NotificationsDropdown", () => {
  it("shows recent job notifications and links to the jobs page", async () => {
    const user = userEvent.setup();
    vi.mocked(useBackgroundJobs).mockReturnValue({
      data: { count: recentJobs.length, next: null, previous: null, results: recentJobs },
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useBackgroundJobs>);

    render(<NotificationsDropdown />, { wrapper: MemoryRouter });

    await user.click(screen.getByLabelText("Open job notifications"));
    expect(screen.getByText("Recent job notifications")).toBeInTheDocument();
    expect(screen.getByText("Narrative DNA: Perfect Blue")).toBeInTheDocument();
    expect(screen.getByText("Complete")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view all/i })).toHaveAttribute("href", "/jobs");
  });
});
