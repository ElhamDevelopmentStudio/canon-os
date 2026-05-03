import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "@/app/App";
import { APP_NAVIGATION } from "@/app/navigation";
import { APP_ROUTES } from "@/app/routeConstants";
import { protectedRouteChildren } from "@/app/router";
import { useAuthStore } from "@/stores/authStore";

vi.mock("@/features/jobs/jobsApi", () => ({
  useBackgroundJobs: () => ({ data: [], error: undefined, isLoading: false, isValidating: false, mutate: vi.fn() }),
}));

vi.mock("@/features/dashboard/dashboardApi", () => ({
  useDashboardSummary: () => ({
    data: {
      counts: { totalMedia: 0, completedMedia: 0, plannedMedia: 0, droppedMedia: 0 },
      mediaTypeBreakdown: [],
      recentActivity: [],
      highestRated: [],
      topTasteSignals: [],
      latestTasteEvolutionInsight: null,
      generatedAt: "2026-01-03T00:00:00Z",
    },
    error: undefined,
    isLoading: false,
    mutate: vi.fn(),
  }),
}));

const authenticatedUser = {
  id: 1,
  email: "reader@example.com",
  username: "reader@example.com",
  profile: {
    id: 1,
    displayName: "Canon Reader",
    timezone: "UTC",
    preferredLanguage: "en",
  },
};

describe("App", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, "", "/");
    document.documentElement.className = "";
    useAuthStore.setState({ currentUser: authenticatedUser, status: "authenticated", error: null, csrfToken: null });
  });

  it("renders the shared CanonOS app shell for authenticated users", async () => {
    render(<App />);

    expect(screen.getByRole("link", { name: /canonos dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /primary navigation/i })).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /private media command center/i })).toBeInTheDocument();
    expect(screen.getByText(/ready for its first media item/i)).toBeInTheDocument();
    expect(screen.getByText(/canon reader/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log out/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /add media/i }).length).toBeGreaterThan(0);

    for (const item of APP_NAVIGATION) {
      const matchingLinks = screen.getAllByRole("link", { name: item.label });
      expect(matchingLinks.some((link) => link.getAttribute("href") === item.route)).toBe(true);
    }
  });

  it("supports theme toggle and collapsed sidebar state", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /toggle theme mode/i }));
    expect(document.documentElement).toHaveClass("dark");

    await user.click(screen.getByRole("button", { name: /collapse sidebar/i }));
    expect(screen.getByRole("button", { name: /expand sidebar/i })).toBeInTheDocument();
  });

  it("keeps route constants aligned with navigation", () => {
    const navRoutes = APP_NAVIGATION.map((item) => item.route);

    expect(navRoutes).toEqual([
      APP_ROUTES.dashboard,
      APP_ROUTES.library,
      APP_ROUTES.candidates,
      APP_ROUTES.discovery,
      APP_ROUTES.criticCouncil,
      APP_ROUTES.tonight,
      APP_ROUTES.tasteProfile,
      APP_ROUTES.tasteEvolution,
      APP_ROUTES.insights,
      APP_ROUTES.completionDetox,
      APP_ROUTES.seasons,
      APP_ROUTES.tasteGraph,
      APP_ROUTES.aftertasteLog,
      APP_ROUTES.queue,
      APP_ROUTES.jobs,
      APP_ROUTES.settings,
    ]);
    expect(new Set(navRoutes).size).toBe(navRoutes.length);
    expect(protectedRouteChildren.length).toBeGreaterThanOrEqual(APP_NAVIGATION.length);
  });

  it("redirects unauthenticated app routes to login", async () => {
    useAuthStore.setState({ currentUser: null, status: "unauthenticated", error: null, csrfToken: null });
    window.history.pushState({}, "", APP_ROUTES.library);

    render(<App />);

    expect(await screen.findByRole("heading", { name: /log in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("renders register form for unauthenticated users", async () => {
    useAuthStore.setState({ currentUser: null, status: "unauthenticated", error: null, csrfToken: null });
    window.history.pushState({}, "", APP_ROUTES.register);

    render(<App />);

    expect(await screen.findByRole("heading", { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });
});
