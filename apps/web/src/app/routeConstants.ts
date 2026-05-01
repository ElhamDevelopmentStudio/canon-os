export const APP_ROUTES = {
  dashboard: "/",
  library: "/library",
  mediaDetail: "/library/:mediaId",
  candidates: "/candidates",
  tonight: "/tonight",
  tasteProfile: "/taste-profile",
  aftertasteLog: "/aftertaste-log",
  queue: "/queue",
  settings: "/settings",
  login: "/login",
  register: "/register",
} as const;

export type AppRouteKey = keyof typeof APP_ROUTES;
export type AppRoutePath = (typeof APP_ROUTES)[AppRouteKey];
