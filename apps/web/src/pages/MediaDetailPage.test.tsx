import type { MediaItem, NarrativeAnalysisResult, TasteDimension } from "@canonos/contracts";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteMediaItem, useMediaItem } from "@/features/media/mediaApi";
import { upsertMediaScores, useTasteDimensions } from "@/features/media/tasteApi";
import { requestNarrativeAnalysis, useNarrativeAnalysis } from "@/features/narrative/narrativeApi";
import { MediaDetailPage } from "@/pages/MediaDetailPage";

vi.mock("@/features/detox/detoxApi", () => ({
  useDetoxRules: () => ({
    data: { count: 0, next: null, previous: null, results: [] },
    error: undefined,
    isLoading: false,
    isValidating: false,
    mutate: vi.fn(),
  }),
}));

vi.mock("@/features/media/mediaApi", () => ({
  deleteMediaItem: vi.fn(),
  useMediaItem: vi.fn(),
}));

vi.mock("@/features/media/tasteApi", () => ({
  upsertMediaScores: vi.fn(),
  useTasteDimensions: vi.fn(),
}));

vi.mock("@/features/metadata/metadataApi", () => ({
  refreshMetadata: vi.fn(),
}));

vi.mock("@/features/narrative/narrativeApi", () => ({
  requestNarrativeAnalysis: vi.fn(),
  useNarrativeAnalysis: vi.fn(),
}));

const media: MediaItem = {
  id: "8a3f2c28-74b6-4a2d-b3fe-c19dbb8a60d9",
  title: "Stalker",
  originalTitle: "Сталкер",
  mediaType: "movie",
  releaseYear: 1979,
  countryLanguage: "Soviet Union / Russian",
  creator: "Andrei Tarkovsky",
  status: "completed",
  personalRating: 9.5,
  startedDate: null,
  completedDate: null,
  runtimeMinutes: 162,
  episodeCount: null,
  pageCount: null,
  audiobookLengthMinutes: null,
  notes: "Patient atmosphere, moral ambiguity, and spiritual theme.",
  createdAt: "2026-01-02T00:00:00Z",
  updatedAt: "2026-01-03T00:00:00Z",
  scores: [],
  latestAftertaste: null,
  externalMetadata: null,
};

const dimensions: TasteDimension[] = [
  {
    id: "6cc99274-279b-4cf7-8dd0-623ed19798e1",
    name: "Story depth",
    slug: "story_depth",
    description: "How layered the story is.",
    direction: "positive",
    isDefault: true,
  },
];

const analysis: NarrativeAnalysisResult = {
  id: "125ed1d6-f611-4632-a273-58d269ef499e",
  mediaItemId: media.id,
  mediaTitle: media.title,
  status: "completed",
  characterComplexityScore: 72,
  plotComplexityScore: 61,
  pacingDensityScore: 42,
  thematicWeightScore: 84,
  moralAmbiguityScore: 78,
  atmosphereScore: 92,
  endingDependencyScore: 66,
  tropeFreshnessScore: 81,
  confidenceScore: 74,
  analysisSummary: "Stalker reads strongest on atmosphere, thematic weight, and moral ambiguity.",
  extractedTraits: [
    {
      key: "character_complexity",
      label: "Character complexity",
      description: "Interior life and agency.",
      score: 72,
      confidenceScore: 74,
      evidence: "Character complexity has support.",
      source: "user_notes_metadata_heuristic",
    },
    {
      key: "atmosphere",
      label: "Atmosphere",
      description: "Mood and sensory identity.",
      score: 92,
      confidenceScore: 74,
      evidence: "Atmosphere is strongly indicated.",
      source: "user_notes_metadata_heuristic",
    },
  ],
  evidenceNotes: "Basis: saved media notes. No full copyrighted source text was stored.",
  sourceBasis: "user_notes",
  provider: "local_heuristic",
  algorithmVersion: "narrative-dna-v1",
  statusEvents: [
    { status: "queued", at: "2026-01-03T00:00:00Z" },
    { status: "running", at: "2026-01-03T00:00:01Z" },
    { status: "completed", at: "2026-01-03T00:00:02Z" },
  ],
  errorMessage: "",
  completedAt: "2026-01-03T00:00:02Z",
  createdAt: "2026-01-03T00:00:00Z",
  updatedAt: "2026-01-03T00:00:02Z",
};

const mockedUseMediaItem = vi.mocked(useMediaItem);
const mockedUseTasteDimensions = vi.mocked(useTasteDimensions);
const mockedUseNarrativeAnalysis = vi.mocked(useNarrativeAnalysis);
const mockedRequestNarrativeAnalysis = vi.mocked(requestNarrativeAnalysis);
const mockedDeleteMediaItem = vi.mocked(deleteMediaItem);
const mockedUpsertMediaScores = vi.mocked(upsertMediaScores);

function renderPage() {
  render(
    <MemoryRouter initialEntries={[`/library/${media.id}`]}>
      <Routes>
        <Route path="/library/:mediaId" element={<MediaDetailPage />} />
        <Route path="/library" element={<div>Library redirect</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("MediaDetailPage Narrative DNA", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedUseMediaItem.mockReturnValue({
      data: media,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useMediaItem>);
    mockedUseTasteDimensions.mockReturnValue({
      data: dimensions,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useTasteDimensions>);
    mockedUseNarrativeAnalysis.mockReturnValue({
      data: null,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useNarrativeAnalysis>);
    mockedRequestNarrativeAnalysis.mockResolvedValue(analysis);
    mockedUpsertMediaScores.mockResolvedValue({ results: [] });
    mockedDeleteMediaItem.mockResolvedValue();
  });

  it("shows the Narrative DNA tab empty state and requests analysis", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("tab", { name: /narrative dna/i }));
    expect(screen.getByText(/No Narrative DNA yet/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/narrative analysis notes/i), "Atmosphere and moral ambiguity.");
    await user.click(screen.getByRole("button", { name: /request narrative analysis/i }));

    expect(mockedRequestNarrativeAnalysis).toHaveBeenCalledWith(media.id, {
      manualNotes: "Atmosphere and moral ambiguity.",
      forceRefresh: false,
      provider: "local_heuristic",
    });
  });

  it("displays completed Narrative DNA scores, traits, and evidence", async () => {
    const user = userEvent.setup();
    mockedUseNarrativeAnalysis.mockReturnValue({
      data: analysis,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useNarrativeAnalysis>);

    renderPage();
    await user.click(screen.getByRole("tab", { name: /narrative dna/i }));

    expect(screen.getByText(/Stalker reads strongest/i)).toBeInTheDocument();
    expect(screen.getByText(/Atmosphere is strongly indicated/i)).toBeInTheDocument();
    expect(within(screen.getByRole("tabpanel")).getByText(/Basis: saved media notes/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /refresh narrative dna/i })).toBeInTheDocument();
  });
});