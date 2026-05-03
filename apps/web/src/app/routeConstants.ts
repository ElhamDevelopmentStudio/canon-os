export const APP_ROUTES = {
  dashboard: "/",
  library: "/library",
  mediaDetail: "/library/:mediaId",
  candidates: "/candidates",
  discovery: "/discover",
  criticCouncil: "/critic-council",
  tonight: "/tonight",
  tasteProfile: "/taste-profile",
  tasteEvolution: "/taste-evolution",
  completionDetox: "/completion-detox",
  seasons: "/seasons",
  canonSeasonDetail: "/seasons/:seasonId",
  tasteGraph: "/taste-graph",
  aftertasteLog: "/aftertaste-log",
  queue: "/queue",
  jobs: "/jobs",
  settings: "/settings",
  login: "/login",
  register: "/register",
} as const;

export type AppRouteKey = keyof typeof APP_ROUTES;
export type AppRoutePath = (typeof APP_ROUTES)[AppRouteKey];
