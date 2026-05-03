import type { Candidate, CandidateEvaluateResponse, CandidateListResponse, CouncilSessionListResponse, QueueItem } from "@canonos/contracts";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  addCandidateToLibrary,
  createCandidate,
  evaluateCandidate,
  updateCandidate,
  useCandidates,
} from "@/features/candidate-evaluator/candidateApi";
import { useCouncilSessions } from "@/features/critic-council/councilApi";
import { createQueueItem } from "@/features/queue/queueApi";
import { useUserSettings } from "@/features/settings/settingsApi";
import { CandidateEvaluatorPage } from "@/pages/CandidateEvaluatorPage";

vi.mock("@/features/queue/queueApi", () => ({
  createQueueItem: vi.fn(),
}));

vi.mock("@/features/settings/settingsApi", () => ({
  useUserSettings: vi.fn(),
}));

vi.mock("@/features/critic-council/councilApi", () => ({
  useCouncilSessions: vi.fn(),
}));

vi.mock("@/features/candidate-evaluator/candidateApi", () => ({
  addCandidateToLibrary: vi.fn(),
  createCandidate: vi.fn(),
  evaluateCandidate: vi.fn(),
  updateCandidate: vi.fn(),
  useCandidates: vi.fn(),
}));

const evaluatedCandidate: Candidate = {
  id: "8a3f2c28-74b6-4a2d-b3fe-c19dbb8a60d9",
  title: "Perfect Blue",
  mediaType: "anime",
  releaseYear: 1997,
  knownCreator: "Satoshi Kon",
  premise: "A pop idol's identity fractures under pressure.",
  sourceOfInterest: "Director backlog",
  hypeLevel: 7,
  expectedGenericness: 2,
  expectedTimeCostMinutes: 81,
  status: "sample",
  latestEvaluation: {
    id: "953b465d-7472-4a1b-a01d-54aebf6f9f72",
    candidateId: "8a3f2c28-74b6-4a2d-b3fe-c19dbb8a60d9",
    decision: "sample",
    confidenceScore: 76,
    likelyFitScore: 81,
    riskScore: 24,
    reasonsFor: ["Strong director signal."],
    reasonsAgainst: ["Sample before committing."],
    narrativeSignals: [{
      traitKey: "atmosphere",
      label: "Atmosphere match",
      impact: 6,
      averageScore: 82,
      evidence: "Your completed Narrative DNA history leans toward atmosphere-heavy works.",
    }],
    bestMood: "Focused and curious",
    recommendedAction: "Sample the first meaningful unit.",

    antiGenericEvaluation: {
      id: "13a7b2c8-eccb-4e8a-98db-9509e673d6db",
      candidateId: "8a3f2c28-74b6-4a2d-b3fe-c19dbb8a60d9",
      mediaItemId: null,
      genericnessRiskScore: 28,
      timeWasteRiskScore: 22,
      positiveExceptionScore: 40,
      detectedSignals: [{
        ruleId: "4fc9a872-9651-4b33-b793-04ba7e3f0704",
        ruleKey: "overhype_mismatch",
        name: "Overhype mismatch",
        description: "High hype can hide personal mismatch.",
        weight: 17,
        score: 8,
        evidence: "High hype combined with genericness can hide personal mismatch.",
      }],
      positiveExceptions: [{
        ruleId: "a9d8a070-cd51-4286-9cf2-3f199fc533c8",
        ruleKey: "auteur_driven_modern_work",
        name: "Auteur-driven modern work",
        description: "Creator signal protects modern exceptions.",
        weight: 22,
        score: 24,
        evidence: "Recent work has creator voice or distinctive craft signals; recency is not penalized.",
      }],
      finalVerdict: "modern_exception",
      createdAt: "2026-01-03T00:00:00Z",
    },
    createdAt: "2026-01-03T00:00:00Z",
  },
  createdAt: "2026-01-02T00:00:00Z",
  updatedAt: "2026-01-03T00:00:00Z",
};

const unevaluatedCandidate: Candidate = {
  ...evaluatedCandidate,
  id: "e61c8c49-9a5e-466c-aeb4-669a6a632af3",
  status: "unevaluated",
  latestEvaluation: null,
};


const councilSessions: CouncilSessionListResponse = {
  count: 1,
  next: null,
  previous: null,
  results: [
    {
      id: "2c2fd73b-ecf8-4b32-b125-e7c8c424f35e",
      candidateId: evaluatedCandidate.id,
      candidateTitle: evaluatedCandidate.title,
      mediaItemId: null,
      mediaItemTitle: null,
      prompt: "Debate this candidate.",
      context: {},
      criticOpinions: [],
      finalDecision: {
        decision: "sample",
        label: "Sample",
        confidenceScore: 72,
        disagreementScore: 34,
        explanation: "Final decision: Sample for Perfect Blue with clear guardrails.",
        appliedToCandidate: false,
      },
      createdAt: "2026-01-05T00:00:00Z",
      updatedAt: "2026-01-05T00:00:00Z",
    },
  ],
};

const sampleQueueItem: QueueItem = {
  id: "6b420311-fd25-45ea-9dc8-076f86b3b8b8",
  mediaItemId: null,
  candidateId: evaluatedCandidate.id,
  title: "Perfect Blue",
  mediaType: "anime",
  priority: "sample_first",
  reason: "Sample the first meaningful unit.",
  estimatedTimeMinutes: 81,
  bestMood: "Focused and curious",
  moodCompatibility: 74,
  intensityLevel: 7,
  complexityLevel: 7,
  commitmentLevel: 4,
  freshnessScore: 100,
  lastRecommendedAt: null,
  timesRecommended: 0,
  isArchived: false,
  queuePosition: 1,
  createdAt: "2026-01-04T00:00:00Z",
  updatedAt: "2026-01-04T00:00:00Z",
};

const sampleList: CandidateListResponse = {
  count: 1,
  next: null,
  previous: null,
  results: [evaluatedCandidate],
};

const evaluationResponse: CandidateEvaluateResponse = {
  candidate: evaluatedCandidate,
  evaluation: evaluatedCandidate.latestEvaluation!,
};

const mockedUseCandidates = vi.mocked(useCandidates);
const mockedUseCouncilSessions = vi.mocked(useCouncilSessions);
const mockedCreateCandidate = vi.mocked(createCandidate);
const mockedEvaluateCandidate = vi.mocked(evaluateCandidate);
const mockedUpdateCandidate = vi.mocked(updateCandidate);
const mockedAddCandidateToLibrary = vi.mocked(addCandidateToLibrary);
const mockedCreateQueueItem = vi.mocked(createQueueItem);
const mockedUseUserSettings = vi.mocked(useUserSettings);

function mockCouncilSessions(data: CouncilSessionListResponse = councilSessions) {
  mockedUseCouncilSessions.mockReturnValue({
    data,
    error: undefined,
    isLoading: false,
    isValidating: false,
    mutate: vi.fn(),
  } as unknown as ReturnType<typeof useCouncilSessions>);
}

function mockCandidates(data: CandidateListResponse = sampleList) {
  mockedUseCandidates.mockReturnValue({
    data,
    error: undefined,
    isLoading: false,
    isValidating: false,
    mutate: vi.fn(),
  } as unknown as ReturnType<typeof useCandidates>);
}

describe("CandidateEvaluatorPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockCandidates();
    mockCouncilSessions();
    mockedUseUserSettings.mockReturnValue({
      data: {
        id: 1,
        profile: { id: 1, displayName: "Canon Reader", timezone: "UTC", preferredLanguage: "en" },
        display: { themePreference: "system" },
        recommendation: {
          defaultMediaTypes: ["movie", "anime"],
          defaultRiskTolerance: "medium",
          modernMediaSkepticismLevel: 5,
          genericnessSensitivity: 6,
          preferredScoringStrictness: 5,
        },
        updatedAt: "2026-01-01T00:00:00Z",
      },
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useUserSettings>);
    mockedCreateCandidate.mockResolvedValue(unevaluatedCandidate);
    mockedUpdateCandidate.mockResolvedValue(evaluatedCandidate);
    mockedEvaluateCandidate.mockResolvedValue(evaluationResponse);
    mockedCreateQueueItem.mockResolvedValue(sampleQueueItem);
    mockedAddCandidateToLibrary.mockResolvedValue({
      candidate: evaluatedCandidate,
      mediaItem: {
        id: "74ac5361-592d-4772-908b-7066bd137ebb",
        title: "Perfect Blue",
        originalTitle: "",
        mediaType: "anime",
        releaseYear: 1997,
        countryLanguage: "",
        creator: "Satoshi Kon",
        status: "planned",
        personalRating: null,
        startedDate: null,
        completedDate: null,
        runtimeMinutes: null,
        episodeCount: null,
        pageCount: null,
        audiobookLengthMinutes: null,
        notes: "Added from evaluator.",
        createdAt: "2026-01-04T00:00:00Z",
        updatedAt: "2026-01-04T00:00:00Z",
      },
    });
  });

  it("renders evaluator history and saved result explanations", async () => {
    const user = userEvent.setup();
    render(<CandidateEvaluatorPage />);

    expect(screen.getByRole("heading", { name: /candidate evaluator/i })).toBeInTheDocument();
    expect(screen.getByText(/Perfect Blue/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /perfect blue/i }));

    expect(screen.getByText(/Strong director signal/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /anti-generic filter/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /narrative dna signals/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /critic council results/i })).toBeInTheDocument();
    expect(screen.getByText(/clear guardrails/i)).toBeInTheDocument();
    expect(screen.getByText(/modern exception/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add to queue/i })).toBeEnabled();
  });

  it("creates and evaluates a candidate from the form", async () => {
    const user = userEvent.setup();
    mockCandidates({ count: 0, next: null, previous: null, results: [] });
    render(<CandidateEvaluatorPage />);

    await user.type(screen.getByLabelText(/^title$/i), "Perfect Blue");
    await user.selectOptions(screen.getByLabelText(/media type/i), "anime");
    await user.clear(screen.getByLabelText(/release year/i));
    await user.type(screen.getByLabelText(/release year/i), "1997");
    await user.type(screen.getByLabelText(/known creator/i), "Satoshi Kon");
    await user.type(screen.getByLabelText(/premise/i), "A pop idol's identity fractures under pressure.");
    await user.click(screen.getByRole("button", { name: /run evaluation/i }));

    expect(mockedCreateCandidate).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Perfect Blue", mediaType: "anime", releaseYear: 1997 }),
    );
    expect(mockedEvaluateCandidate).toHaveBeenCalledWith(unevaluatedCandidate.id);
    expect(await screen.findByText(/Sample first/i)).toBeInTheDocument();
  });

  it("skips a selected candidate", async () => {
    const user = userEvent.setup();
    render(<CandidateEvaluatorPage />);

    await user.click(screen.getByRole("button", { name: /perfect blue/i }));
    await user.click(screen.getByRole("button", { name: /skip candidate/i }));

    expect(mockedUpdateCandidate).toHaveBeenCalledWith(evaluatedCandidate.id, { status: "skip" });
  });


  it("adds an evaluated candidate to the queue", async () => {
    const user = userEvent.setup();
    render(<CandidateEvaluatorPage />);

    await user.click(screen.getByRole("button", { name: /perfect blue/i }));
    await user.click(screen.getByRole("button", { name: /add to queue/i }));

    expect(mockedCreateQueueItem).toHaveBeenCalledWith({
      candidateId: evaluatedCandidate.id,
      priority: "sample_first",
      reason: "Sample the first meaningful unit.",
      bestMood: "Focused and curious",
      estimatedTimeMinutes: 81,
    });
    expect(await screen.findByText(/added “perfect blue” to the queue/i)).toBeInTheDocument();
  });

  it("adds an evaluated candidate to the library", async () => {
    const user = userEvent.setup();
    render(<CandidateEvaluatorPage />);

    await user.click(screen.getByRole("button", { name: /perfect blue/i }));
    const resultCard = screen.getByRole("button", { name: /add to library/i }).closest("section");
    expect(resultCard).not.toBeNull();
    await user.click(within(resultCard as HTMLElement).getByRole("button", { name: /add to library/i }));

    expect(mockedAddCandidateToLibrary).toHaveBeenCalledWith(evaluatedCandidate.id, {
      status: "planned",
      notes: "Added from the candidate evaluator.",
    });
    expect(await screen.findByText(/added “perfect blue” to the library/i)).toBeInTheDocument();
  });
});
