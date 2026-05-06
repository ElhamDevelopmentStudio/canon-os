import type {
  DiscoveryGenerateResponse,
  DiscoveryTrail,
  DiscoveryTrailListResponse,
  QueueItem,
} from "@canonos/contracts";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  deleteDiscoveryTrail,
  generateDiscoveryTrail,
  saveDiscoveryTrail,
  useDiscoveryTrails,
} from "@/features/discovery/discoveryApi";
import { createQueueItem } from "@/features/queue/queueApi";
import { MediaArchaeologistPage } from "@/pages/MediaArchaeologistPage";

vi.mock("@/features/discovery/discoveryApi", () => ({
  deleteDiscoveryTrail: vi.fn(),
  generateDiscoveryTrail: vi.fn(),
  saveDiscoveryTrail: vi.fn(),
  useDiscoveryTrails: vi.fn(),
}));

vi.mock("@/features/queue/queueApi", () => ({
  createQueueItem: vi.fn(),
}));

const generatedResponse: DiscoveryGenerateResponse = {
  search: {
    mode: "deep_cut",
    theme: "memory and identity",
    mood: "patient",
    era: "",
    countryLanguage: undefined,
    mediaType: "novel",
    creator: undefined,
    narrativePattern: undefined,
    favoriteWork: undefined,
    sourceMediaItemId: null,
  },
  analysis: {
    underexploredMediaTypes: ["novel", "audiobook"],
    underexploredEras: ["pre_1970"],
    underexploredCountryLanguages: ["Argentine Spanish"],
    strongestMediaTypes: ["movie"],
    sourceTitle: null,
  },
  draft: {
    name: "Memory and identity deep cuts",
    theme: "memory and identity",
    description: "A trail of under-discussed works that expand identity and memory patterns.",
    sourceMediaItemId: null,
    sourceMediaItemTitle: null,
    resultItems: [
      {
        id: "the-invention-of-morel",
        title: "The Invention of Morel",
        mediaType: "novel",
        releaseYear: 1940,
        countryLanguage: "Argentine Spanish",
        creator: "Adolfo Bioy Casares",
        premise: "A fugitive finds a strange island machine replaying identity and desire.",
        discoveryScore: 91,
        obscurityScore: 84,
        confidenceScore: 78,
        estimatedTimeMinutes: 180,
        reasons: [
          {
            kind: "taste_expansion",
            label: "Expands identity pattern",
            detail: "It bends identity and memory through a concise metaphysical premise.",
            weight: 30,
          },
          {
            kind: "risk",
            label: "Older style risk",
            detail: "The cool, compressed style may feel emotionally distant.",
            weight: 10,
          },
        ],
        expansionRationale: "A compact old novel route into metaphysical identity puzzles.",
        riskRationale: "Its distance may not land if you need warm characterization.",
        suggestedAction: "Read the first third and judge the island mechanism.",
      },
    ],
    createdAt: null,
  },
  results: [],
  generatedAt: "2026-05-03T00:00:00Z",
};
generatedResponse.results = generatedResponse.draft.resultItems;

const savedTrail: DiscoveryTrail = {
  ...generatedResponse.draft,
  id: "3c2ef1da-dcc0-4fd6-8820-d3e95fb5446c",
  createdAt: "2026-05-03T00:00:00Z",
};

const emptyList: DiscoveryTrailListResponse = {
  count: 0,
  next: null,
  previous: null,
  results: [],
};

const savedList: DiscoveryTrailListResponse = {
  count: 1,
  next: null,
  previous: null,
  results: [savedTrail],
};

const queueItem: QueueItem = {
  id: "9f661ed7-2804-4b1c-9ae9-09caee1e6b14",
  mediaItemId: null,
  candidateId: null,
  title: "The Invention of Morel",
  mediaType: "novel",
  priority: "sample_first",
  reason: "Read the first third and judge the island mechanism.",
  estimatedTimeMinutes: 180,
  bestMood: "patient",
  moodCompatibility: 78,
  intensityLevel: 5,
  complexityLevel: 6,
  commitmentLevel: 4,
  freshnessScore: 100,
  lastRecommendedAt: null,
  timesRecommended: 0,
  isArchived: false,
  queuePosition: 1,
  createdAt: "2026-05-03T00:00:00Z",
  updatedAt: "2026-05-03T00:00:00Z",
};

const mockedUseDiscoveryTrails = vi.mocked(useDiscoveryTrails);
const mockedGenerateDiscoveryTrail = vi.mocked(generateDiscoveryTrail);
const mockedSaveDiscoveryTrail = vi.mocked(saveDiscoveryTrail);
const mockedDeleteDiscoveryTrail = vi.mocked(deleteDiscoveryTrail);
const mockedCreateQueueItem = vi.mocked(createQueueItem);

async function openSavedTrails(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /saved trails/i }));
  return screen.getByRole("dialog", { name: /saved discovery trails/i });
}

function mockTrails(data: DiscoveryTrailListResponse = emptyList) {
  mockedUseDiscoveryTrails.mockReturnValue({
    data,
    error: undefined,
    isLoading: false,
    isValidating: false,
    mutate: vi.fn(),
  } as unknown as ReturnType<typeof useDiscoveryTrails>);
}

describe("MediaArchaeologistPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockTrails();
    mockedGenerateDiscoveryTrail.mockResolvedValue(generatedResponse);
    mockedSaveDiscoveryTrail.mockResolvedValue(savedTrail);
    mockedCreateQueueItem.mockResolvedValue(queueItem);
    mockedDeleteDiscoveryTrail.mockResolvedValue(undefined);
  });

  it("renders the generator and opens the empty saved trail dialog", async () => {
    const user = userEvent.setup();
    render(<MediaArchaeologistPage />);

    expect(screen.getByRole("heading", { name: /media archaeologist/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/theme/i)).toBeInTheDocument();
    expect(screen.queryByText(/No saved discovery trails/i)).not.toBeInTheDocument();

    const savedDialog = await openSavedTrails(user);
    expect(within(savedDialog).getByText(/No saved discovery trails/i)).toBeInTheDocument();
  });

  it("generates, saves, and sends a discovery result to the queue", async () => {
    const user = userEvent.setup();
    render(<MediaArchaeologistPage />);

    await user.type(screen.getByLabelText(/theme/i), "memory and identity");
    await user.type(screen.getByLabelText(/mood/i), "patient");
    await user.selectOptions(screen.getByLabelText(/preferred medium/i), "novel");
    await user.click(screen.getByRole("button", { name: /generate discovery trail/i }));

    expect(mockedGenerateDiscoveryTrail).toHaveBeenCalledWith(
      expect.objectContaining({ theme: "memory and identity", mood: "patient", mediaType: "novel" }),
    );
    expect(await screen.findByText("Discovery trail generated.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "The Invention of Morel" })).toBeInTheDocument();
    expect(screen.getByText(/Why this expands your taste/i)).toBeInTheDocument();
    expect(screen.getByText(/Why it may fail/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /save trail/i }));
    expect(mockedSaveDiscoveryTrail).toHaveBeenCalledWith(generatedResponse.draft);
    expect(await screen.findByText("Discovery trail saved.")).toBeInTheDocument();

    const resultCard = screen.getByRole("heading", { name: "The Invention of Morel" }).closest("article");
    expect(resultCard).not.toBeNull();
    await user.click(within(resultCard as HTMLElement).getByRole("button", { name: /add to queue/i }));
    expect(mockedCreateQueueItem).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "The Invention of Morel",
        mediaType: "novel",
        priority: "sample_first",
        bestMood: "patient",
      }),
    );
    expect(await screen.findByText("Added “The Invention of Morel” to the queue.")).toBeInTheDocument();
  });

  it("shows and deletes saved trails", async () => {
    const user = userEvent.setup();
    mockTrails(savedList);
    render(<MediaArchaeologistPage />);

    const savedDialog = await openSavedTrails(user);
    expect(within(savedDialog).getByText("Memory and identity deep cuts")).toBeInTheDocument();
    await user.click(within(savedDialog).getByRole("button", { name: /delete memory and identity deep cuts/i }));

    expect(mockedDeleteDiscoveryTrail).toHaveBeenCalledWith(savedTrail.id);
    expect(await screen.findByText("Removed “Memory and identity deep cuts”.")).toBeInTheDocument();
  });
});
