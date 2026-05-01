export type UserProfile = {
  id: number;
  displayName: string;
  timezone: string;
  preferredLanguage: string;
};

export type AuthUser = {
  id: number;
  email: string;
  username: string;
  profile: UserProfile;
};

export type AuthSession = {
  authenticated: boolean;
  user: AuthUser | null;
  csrfToken?: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  email: string;
  password: string;
  displayName: string;
};

export type ProfileUpdateRequest = {
  displayName?: string;
  timezone?: string;
  preferredLanguage?: string;
};

export type AuthResponse = AuthSession;
