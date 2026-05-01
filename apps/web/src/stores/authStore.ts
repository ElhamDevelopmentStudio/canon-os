import type { AuthUser, LoginRequest, RegisterRequest } from "@canonos/contracts";
import { create } from "zustand";

import { getCurrentUser, login as loginRequest, logout as logoutRequest, register as registerRequest } from "@/features/auth/authApi";
import { ApiError } from "@/lib/errors";

export type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

type AuthState = {
  currentUser: AuthUser | null;
  csrfToken: string | null;
  status: AuthStatus;
  error: string | null;
  fetchCurrentUser: () => Promise<void>;
  login: (request: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  register: (request: RegisterRequest) => Promise<void>;
  clearAuthError: () => void;
};

function messageForError(error: unknown): string {
  if (error instanceof ApiError && error.status === 403) {
    return "Please log in to continue.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Authentication failed. Please try again.";
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  csrfToken: null,
  status: "idle",
  error: null,
  fetchCurrentUser: async () => {
    set({ status: "loading", error: null });
    try {
      const session = await getCurrentUser();
      set({
        currentUser: session.user,
        csrfToken: session.csrfToken ?? null,
        status: session.authenticated ? "authenticated" : "unauthenticated",
        error: null,
      });
    } catch (error) {
      set({ currentUser: null, status: "unauthenticated", error: error instanceof ApiError && error.status === 403 ? null : messageForError(error) });
    }
  },
  login: async (request) => {
    set({ status: "loading", error: null });
    try {
      const session = await loginRequest(request);
      set({ currentUser: session.user, csrfToken: session.csrfToken ?? null, status: "authenticated", error: null });
    } catch (error) {
      set({ currentUser: null, status: "unauthenticated", error: messageForError(error) });
      throw error;
    }
  },
  logout: async () => {
    set({ status: "loading", error: null });
    try {
      const session = await logoutRequest();
      set({ currentUser: session.user, csrfToken: session.csrfToken ?? null, status: "unauthenticated", error: null });
    } catch {
      set({ currentUser: null, csrfToken: null, status: "unauthenticated", error: null });
    }
  },
  register: async (request) => {
    set({ status: "loading", error: null });
    try {
      const session = await registerRequest(request);
      set({ currentUser: session.user, csrfToken: session.csrfToken ?? null, status: "authenticated", error: null });
    } catch (error) {
      set({ currentUser: null, status: "unauthenticated", error: messageForError(error) });
      throw error;
    }
  },
  clearAuthError: () => set({ error: null }),
}));
