import type { AdaptationPath, AdaptationRelation, MediaItem, NarrativeAnalysisResult, TasteDimension } from "@canonos/contracts";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteMediaItem, useMediaItem, useMediaItems } from "@/features/media/mediaApi";
import { upsertMediaScores, useTasteDimensions } from "@/features/media/tasteApi";
import { requestNarrativeAnalysis, useNarrativeAnalysis } from "@/features/narrative/narrativeApi";
import {
  createAdaptationRelation,
  deleteAdaptationRelation,
  generateAdaptationPath,
  useAdaptationMap,
  useAdaptationRelations,
} from "@/features/adaptations/adaptationsApi";
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
  useMediaItems: vi.fn(),
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

vi.mock("@/features/adaptations/adaptationsApi", () => ({
  createAdaptationRelation: vi.fn(),
  deleteAdaptationRelation: vi.fn(),
  generateAdaptationPath: vi.fn(),
  useAdaptationMap: vi.fn(),
  useAdaptationRelations: vi.fn(),
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

const adaptationSource: MediaItem = {
  ...media,
  id: "c0bbef6d-f2f1-45f5-b870-c43f3b84d255",
  title: "Roadside Picnic",
  originalTitle: "Пикник на обочине",
  mediaType: "novel",
  creator: "Arkady and Boris Strugatsky",
  runtimeMinutes: null,
  pageCount: 224,
  personalRating: 9,
};

const adaptationRelation: AdaptationRelation = {
  id: "f6a1d572-55e7-4991-bc34-a7cb6a604c7c",
  sourceMediaItemId: adaptationSource.id,
  adaptationMediaItemId: media.id,
  sourceTitle: adaptationSource.title,
  adaptationTitle: media.title,
  sourceMediaType: "novel",
  adaptationMediaType: "movie",
  relationType: "novel_to_film",
  completeness: "loose",
  faithfulnessScore: 74,
  pacingPreservationScore: 82,
  soulPreservationScore: 91,
  recommendedExperienceOrder: "read_first",
  notes: "Loose but spiritually aligned adaptation.",
  createdAt: "2026-01-03T00:00:00Z",
  updatedAt: "2026-01-03T00:00:00Z",
};

const adaptationPath: AdaptationPath = {
  mediaItemId: media.id,
  mediaTitle: media.title,
  relations: [adaptationRelation],
  recommendation: {
    recommendation: "read_first",
    label: "Read first",
    rationale: "Roadside Picnic and Stalker preserve the soul but diverge in plot.",
    confidenceScore: 82,
    risks: [
      {
        kind: "changed_tone",
        label: "Changed tone",
        severity: "medium",
        reason: "Loose relation may diverge from source intent.",
      },
    ],
  },
  createdAt: "2026-01-03T00:00:00Z",
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
const mockedUseMediaItems = vi.mocked(useMediaItems);
const mockedUseTasteDimensions = vi.mocked(useTasteDimensions);
const mockedUseNarrativeAnalysis = vi.mocked(useNarrativeAnalysis);
const mockedRequestNarrativeAnalysis = vi.mocked(requestNarrativeAnalysis);
const mockedDeleteMediaItem = vi.mocked(deleteMediaItem);
const mockedUpsertMediaScores = vi.mocked(upsertMediaScores);
const mockedUseAdaptationRelations = vi.mocked(useAdaptationRelations);
const mockedUseAdaptationMap = vi.mocked(useAdaptationMap);
const mockedCreateAdaptationRelation = vi.mocked(createAdaptationRelation);
const mockedDeleteAdaptationRelation = vi.mocked(deleteAdaptationRelation);
const mockedGenerateAdaptationPath = vi.mocked(generateAdaptationPath);

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
    mockedUseMediaItems.mockReturnValue({
      data: { count: 2, next: null, previous: null, results: [media, adaptationSource] },
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useMediaItems>);
    mockedUseAdaptationRelations.mockReturnValue({
      data: { count: 1, next: null, previous: null, results: [adaptationRelation] },
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useAdaptationRelations>);
    mockedUseAdaptationMap.mockReturnValue({
      data: adaptationPath,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useAdaptationMap>);
    mockedRequestNarrativeAnalysis.mockResolvedValue(analysis);
    mockedUpsertMediaScores.mockResolvedValue({ results: [] });
    mockedDeleteMediaItem.mockResolvedValue();
    mockedCreateAdaptationRelation.mockResolvedValue(adaptationRelation);
    mockedDeleteAdaptationRelation.mockResolvedValue();
    mockedGenerateAdaptationPath.mockResolvedValue(adaptationPath);
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

  it("displays adaptation relations and generates an experience path", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("tab", { name: /adaptations/i }));

    expect(screen.getByText(/Roadside Picnic → Stalker/i)).toBeInTheDocument();
    expect(screen.getByText(/Loose but spiritually aligned adaptation/i)).toBeInTheDocument();
    expect(screen.getByText(/Best Experience Path/i)).toBeInTheDocument();
    expect(screen.getByText(/Roadside Picnic and Stalker preserve/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /get experience path/i }));
    expect(mockedGenerateAdaptationPath).toHaveBeenCalledWith(media.id);
  });

  it("creates and deletes adaptation relations from the Adaptations tab", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("tab", { name: /adaptations/i }));
    await user.click(screen.getByRole("button", { name: /^add adaptation relation$/i }));

    const dialog = screen.getByRole("dialog", { name: /add adaptation relation/i });
    await user.selectOptions(within(dialog).getByLabelText(/source media/i), adaptationSource.id);
    await user.selectOptions(within(dialog).getByLabelText(/adaptation media/i), media.id);
    await user.selectOptions(within(dialog).getByLabelText(/relation type/i), "novel_to_film");
    await user.selectOptions(within(dialog).getByLabelText(/completeness/i), "complete");
    await user.clear(within(dialog).getByLabelText(/faithfulness score/i));
    await user.type(within(dialog).getByLabelText(/faithfulness score/i), "88");
    await user.type(within(dialog).getByLabelText(/pacing preservation score/i), "80");
    await user.type(within(dialog).getByLabelText(/soul preservation score/i), "92");
    await user.type(within(dialog).getByLabelText(/comparison notes/i), "Faithful enough but more contemplative.");
    await user.click(within(dialog).getByRole("button", { name: /save relation/i }));

    expect(mockedCreateAdaptationRelation).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceMediaItemId: adaptationSource.id,
        adaptationMediaItemId: media.id,
        relationType: "novel_to_film",
        completeness: "complete",
        faithfulnessScore: 88,
        pacingPreservationScore: 80,
        soulPreservationScore: 92,
      }),
    );

    await user.click(screen.getByRole("button", { name: /remove relation/i }));
    expect(mockedDeleteAdaptationRelation).toHaveBeenCalledWith(adaptationRelation.id);
  });

});