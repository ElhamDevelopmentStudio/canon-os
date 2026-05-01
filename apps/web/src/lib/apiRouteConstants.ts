export const API_ROUTES = {
  root: "/",
  health: "/health/",
  authCsrf: "/auth/csrf/",
  authRegister: "/auth/register/",
  authLogin: "/auth/login/",
  authLogout: "/auth/logout/",
  authMe: "/auth/me/",
  authProfile: "/auth/profile/",
  dashboardSummary: "/dashboard/summary/",
  mediaItems: "/media-items/",
  tasteDimensions: "/taste-dimensions/",
  schema: "/schema/",
  swaggerDocs: "/docs/swagger/",
  scalarDocs: "/docs/scalar/",
} as const;

export type ApiRouteKey = keyof typeof API_ROUTES;
export type ApiRoutePath = (typeof API_ROUTES)[ApiRouteKey];
