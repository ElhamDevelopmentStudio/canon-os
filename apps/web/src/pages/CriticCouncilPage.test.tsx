import type {
  CandidateListResponse,
  CouncilSession,
  CouncilSessionListResponse,
  CriticPersonaListResponse,
  MediaItemListResponse,
} from "@canonos/contracts";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCandidates } from "@/features/candidate-evaluator/candidateApi";
import {
  applyCouncilDecisionToCandidate,
  createCouncilSession,
  resetCriticPersonas,
  updateCriticPersona,
  useCouncilSessions,
  useCriticPersonas,
} from "@/features/critic-council/councilApi";
import { useMediaItems } from "@/features/media/mediaApi";
import { CriticCouncilPage } from "@/pages/CriticCouncilPage";

vi.mock("@/features/candidate-evaluator/candidateApi", () => ({
  useCandidates: vi.fn(),
}));

vi.mock("@/features/media/mediaApi", () => ({
  useMediaItems: vi.fn(),
}));

vi.mock("@/features/critic-council/councilApi", () => ({
  applyCouncilDecisionToCandidate: vi.fn(),
  createCouncilSession: vi.fn(),
  resetCriticPersonas: vi.fn(),
  updateCriticPersona: vi.fn(),
  useCouncilSessions: vi.fn(),
  useCriticPersonas: vi.fn(),
}));

const personas: CriticPersonaListResponse = {
  count: 8,
  next: null,
  previous: null,
  results: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      key: "ruthless_critic",
      name: "Ruthless Critic",
      role: "ruthless_critic",
      description: "Protects time from generic media.",
      weight: 18,
      isEnabled: true,
      sortOrder: 10,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      key: "modern_defender",
      name: "Modern Defender",
      role: "modern_defender",
      description: "Protects modern exceptions from unfair bias.",
      weight: 16,
      isEnabled: true,
      sortOrder: 30,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  ],
};

const candidates: CandidateListResponse = {
  count: 1,
  next: null,
  previous: null,
  results: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      title: "Modern Exception",
      mediaType: "movie",
      releaseYear: 2024,
      knownCreator: "Auteur",
      premise: "Original craft and atmosphere.",
      sourceOfInterest: "Friend signal",
      hypeLevel: 3,
      expectedGenericness: 2,
      expectedTimeCostMinutes: 110,
      status: "sample",
      latestEvaluation: null,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  ],
};

const mediaItems: MediaItemListResponse = {
  count: 1,
  next: null,
  previous: null,
  results: [
    {
      id: "44444444-4444-4444-8444-444444444444",
      title: "Serial Experiments Lain",
      originalTitle: "",
      mediaType: "anime",
      releaseYear: 1998,
      countryLanguage: "Japan / Japanese",
      creator: "Yasuyuki Ueda",
      status: "planned",
      personalRating: null,
      startedDate: null,
      completedDate: null,
      runtimeMinutes: null,
      episodeCount: 13,
      pageCount: null,
      audiobookLengthMinutes: null,
      notes: "Identity, technology, atmosphere.",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  ],
};

const session: CouncilSession = {
  id: "55555555-5555-4555-8555-555555555555",
  candidateId: candidates.results[0].id,
  candidateTitle: "Modern Exception",
  mediaItemId: mediaItems.results[0].id,
  mediaItemTitle: "Serial Experiments Lain",
  prompt: "Fair but strict debate.",
  context: {},
  criticOpinions: [
    {
      personaId: personas.results[0].id,
      role: "ruthless_critic",
      name: "Ruthless Critic",
      description: "Protects time.",
      weight: 18,
      recommendation: "sample",
      recommendationLabel: "Sample",
      confidence: 72,
      stance: "conditional",
      argument: "Protect time and demand proof early.",
      reason: "Protect time and demand proof early.",
      evidence: ["Risk is manageable."],
    },
    {
      personaId: personas.results[1].id,
      role: "modern_defender",
      name: "Modern Defender",
      description: "Fairness rule.",
      weight: 16,
      recommendation: "sample",
      recommendationLabel: "Sample",
      confidence: 68,
      stance: "fairness",
      argument: "Recency alone is not a flaw.",
      reason: "Recency alone is not a flaw.",
      evidence: ["Modern fairness rule."],
    },
  ],
  finalDecision: {
    decision: "sample",
    label: "Sample",
    confidenceScore: 70,
    disagreementScore: 22,
    explanation: "Final decision: Sample for Modern Exception. This is not a hidden score average.",
    appliedToCandidate: false,
  },
  createdAt: "2026-01-02T00:00:00Z",
  updatedAt: "2026-01-02T00:00:00Z",
};

const sessions: CouncilSessionListResponse = {
  count: 1,
  next: null,
  previous: null,
  results: [session],
};

const mockedUseCriticPersonas = vi.mocked(useCriticPersonas);
const mockedUseCouncilSessions = vi.mocked(useCouncilSessions);
const mockedUseCandidates = vi.mocked(useCandidates);
const mockedUseMediaItems = vi.mocked(useMediaItems);
const mockedCreateCouncilSession = vi.mocked(createCouncilSession);
const mockedUpdateCriticPersona = vi.mocked(updateCriticPersona);
const mockedResetCriticPersonas = vi.mocked(resetCriticPersonas);
const mockedApplyCouncilDecisionToCandidate = vi.mocked(applyCouncilDecisionToCandidate);

function mockHooks() {
  mockedUseCriticPersonas.mockReturnValue({
    data: personas,
    error: undefined,
    isLoading: false,
    isValidating: false,
    mutate: vi.fn(),
  } as unknown as ReturnType<typeof useCriticPersonas>);
  mockedUseCouncilSessions.mockReturnValue({
    data: sessions,
    error: undefined,
    isLoading: false,
    isValidating: false,
    mutate: vi.fn(),
  } as unknown as ReturnType<typeof useCouncilSessions>);
  mockedUseCandidates.mockReturnValue({
    data: candidates,
    error: undefined,
    isLoading: false,
    isValidating: false,
    mutate: vi.fn(),
  } as unknown as ReturnType<typeof useCandidates>);
  mockedUseMediaItems.mockReturnValue({
    data: mediaItems,
    error: undefined,
    isLoading: false,
    isValidating: false,
    mutate: vi.fn(),
  } as unknown as ReturnType<typeof useMediaItems>);
}

describe("CriticCouncilPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockHooks();
    mockedCreateCouncilSession.mockResolvedValue(session);
    mockedUpdateCriticPersona.mockResolvedValue({ ...personas.results[0], weight: 4, isEnabled: false });
    mockedResetCriticPersonas.mockResolvedValue(personas.results);
    mockedApplyCouncilDecisionToCandidate.mockResolvedValue({
      session: { ...session, finalDecision: { ...session.finalDecision, appliedToCandidate: true } },
      candidate: { ...candidates.results[0], status: "sample" },
    });
  });

  it("renders prompt, selectors, signal strip, settings dialog, opinions, and history dialog", async () => {
    const user = userEvent.setup();
    render(<CriticCouncilPage />);

    expect(screen.getByRole("heading", { name: /critic council/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Council prompt / context")).toBeInTheDocument();
    expect(screen.getByLabelText(/^candidate$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/media item/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /run council/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /council signals/i })).toHaveTextContent("2/2");
    expect(screen.getAllByText(/Final decision: Sample/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /critic settings/i }));
    const settingsDialog = screen.getByRole("dialog", { name: /critic settings/i });
    expect(within(settingsDialog).getByText(/Ruthless Critic/i)).toBeInTheDocument();
    expect(within(settingsDialog).getByText(/Modern Defender/i)).toBeInTheDocument();
    await user.click(within(settingsDialog).getByRole("button", { name: /close/i }));

    await user.click(screen.getByRole("button", { name: /history/i }));
    const historyDialog = screen.getByRole("dialog", { name: /council history/i });
    expect(within(historyDialog).getAllByText(/Modern Exception/i).length).toBeGreaterThan(0);
  });

  it("runs a council session and applies the decision to a candidate", async () => {
    const user = userEvent.setup();
    render(<CriticCouncilPage />);

    await user.type(screen.getByLabelText("Council prompt / context"), "Fair but strict debate.");
    await user.selectOptions(screen.getByLabelText(/^candidate$/i), candidates.results[0].id);
    await user.selectOptions(screen.getByLabelText(/media item/i), mediaItems.results[0].id);
    await user.click(screen.getByRole("button", { name: /run council/i }));

    expect(mockedCreateCouncilSession).toHaveBeenCalledWith({
      prompt: "Fair but strict debate.",
      candidateId: candidates.results[0].id,
      mediaItemId: mediaItems.results[0].id,
    });
    expect(await screen.findByText(/Critic Council finished/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /add decision to candidate/i }));
    expect(mockedApplyCouncilDecisionToCandidate).toHaveBeenCalledWith(session.id);
    expect(await screen.findByText(/Candidate marked as Sample/i)).toBeInTheDocument();
  });

  it("updates critic toggles and weights", async () => {
    const user = userEvent.setup();
    render(<CriticCouncilPage />);

    await user.click(screen.getByRole("button", { name: /critic settings/i }));
    const settingsDialog = screen.getByRole("dialog", { name: /critic settings/i });
    const settingsSection = within(settingsDialog).getByRole("region", { name: /critic settings/i });
    const ruthlessCard = within(settingsSection).getByText("Ruthless Critic").closest("article");
    expect(ruthlessCard).not.toBeNull();
    await user.click(within(ruthlessCard as HTMLElement).getByLabelText(/enabled/i));
    await user.clear(within(ruthlessCard as HTMLElement).getByLabelText(/weight/i));
    await user.type(within(ruthlessCard as HTMLElement).getByLabelText(/weight/i), "4");
    await user.click(within(ruthlessCard as HTMLElement).getByRole("button", { name: /save critic/i }));

    expect(mockedUpdateCriticPersona).toHaveBeenCalledWith(personas.results[0].id, {
      isEnabled: false,
      weight: 4,
    });
  });
});
