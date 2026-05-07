import type { GraphRebuildJob, TasteGraphSummary } from "@canonos/contracts";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useBackgroundJob } from "@/features/jobs/jobsApi";
import { rebuildTasteGraph, useTasteGraphSummary } from "@/features/tastegraph/tasteGraphApi";
import { TasteGraphPage } from "@/pages/TasteGraphPage";

vi.mock("@/features/tastegraph/tasteGraphApi", () => ({
  rebuildTasteGraph: vi.fn(),
  useTasteGraphSummary: vi.fn(),
}));

vi.mock("@/features/jobs/jobsApi", () => ({
  useBackgroundJob: vi.fn(),
}));

const summary: TasteGraphSummary = {
  generatedAt: "2026-05-07T04:30:00Z",
  isEmpty: false,
  nodeCount: 12,
  edgeCount: 18,
  evidenceCounts: {
    mediaNodeCount: 4,
    creatorNodeCount: 2,
    dimensionNodeCount: 3,
    aftertasteSignalNodeCount: 2,
    narrativeTraitNodeCount: 1,
    edgeCount: 18,
  },
  strongestThemes: [
    {
      id: "dimension-atmosphere",
      label: "Atmosphere",
      nodeType: "dimension",
      weight: 8.4,
      evidenceCount: 3,
      evidenceLabel: "3 scored works",
    },
  ],
  strongestCreators: [
    {
      id: "creator-tarkovsky",
      label: "Andrei Tarkovsky",
      nodeType: "creator",
      weight: 7.2,
      evidenceCount: 2,
      evidenceLabel: "2 connected works",
    },
  ],
  strongestMedia: [
    {
      id: "media-stalker",
      label: "Stalker",
      nodeType: "media",
      mediaType: "movie",
      weight: 9.1,
      evidenceCount: 4,
      evidenceLabel: "4 signals",
    },
  ],
  weakNegativeSignals: [
    {
      id: "dimension-pacing",
      label: "Generic pacing",
      nodeType: "dimension",
      weight: -4.2,
      evidenceCount: 1,
      evidenceLabel: "1 warning",
    },
  ],
  textGraph: ["Stalker -> created_by -> Andrei Tarkovsky", "Stalker -> dimension_signal -> Atmosphere"],
};

const rebuildJob: GraphRebuildJob = {
  id: "job-1",
  status: "completed",
  message: "TasteGraph rebuilt from media evidence.",
  nodeCount: 12,
  edgeCount: 18,
  startedAt: "2026-05-07T04:30:00Z",
  finishedAt: "2026-05-07T04:31:00Z",
};

const mockedUseTasteGraphSummary = vi.mocked(useTasteGraphSummary);
const mockedRebuildTasteGraph = vi.mocked(rebuildTasteGraph);
const mockedUseBackgroundJob = vi.mocked(useBackgroundJob);

function swrResult<T>(data: T) {
  return {
    data,
    error: undefined,
    isLoading: false,
    isValidating: false,
    mutate: vi.fn(),
  };
}

describe("TasteGraphPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedUseTasteGraphSummary.mockReturnValue(swrResult(summary) as unknown as ReturnType<typeof useTasteGraphSummary>);
    mockedUseBackgroundJob.mockReturnValue(swrResult(undefined) as unknown as ReturnType<typeof useBackgroundJob>);
    mockedRebuildTasteGraph.mockResolvedValue(rebuildJob);
  });

  it("renders the graph console and rebuilds the graph", async () => {
    const user = userEvent.setup();
    render(<TasteGraphPage />);

    expect(screen.getByRole("heading", { name: "TasteGraph" })).toBeInTheDocument();
    expect(screen.getByText("Evidence map")).toBeInTheDocument();
    expect(screen.getByText("Strongest connected creators")).toBeInTheDocument();
    expect(screen.getByText("Andrei Tarkovsky")).toBeInTheDocument();
    expect(screen.getByText("Stalker -> created_by -> Andrei Tarkovsky")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Rebuild TasteGraph" }));

    expect(mockedRebuildTasteGraph).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("TasteGraph rebuild completed")).toBeInTheDocument();
  });
});
