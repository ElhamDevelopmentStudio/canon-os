export const API_ROUTES = {
  root: "/",
  health: "/health/",
  schema: "/schema/",
  swaggerDocs: "/docs/swagger/",
  scalarDocs: "/docs/scalar/",
} as const;

export type ApiRouteKey = keyof typeof API_ROUTES;
export type ApiRoutePath = (typeof API_ROUTES)[ApiRouteKey];
