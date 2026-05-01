import { createBrowserRouter, type RouteObject } from "react-router-dom";

import { APP_ROUTES } from "@/app/routeConstants";
import { AppLayout } from "@/app/layouts/AppLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";

export const appRoutes: RouteObject[] = [
  {
    path: APP_ROUTES.dashboard,
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: APP_ROUTES.library.slice(1), element: <PlaceholderPage route={APP_ROUTES.library} /> },
      { path: APP_ROUTES.candidates.slice(1), element: <PlaceholderPage route={APP_ROUTES.candidates} /> },
      { path: APP_ROUTES.tonight.slice(1), element: <PlaceholderPage route={APP_ROUTES.tonight} /> },
      { path: APP_ROUTES.tasteProfile.slice(1), element: <PlaceholderPage route={APP_ROUTES.tasteProfile} /> },
      { path: APP_ROUTES.aftertasteLog.slice(1), element: <PlaceholderPage route={APP_ROUTES.aftertasteLog} /> },
      { path: APP_ROUTES.queue.slice(1), element: <PlaceholderPage route={APP_ROUTES.queue} /> },
      { path: APP_ROUTES.settings.slice(1), element: <PlaceholderPage route={APP_ROUTES.settings} /> },
    ],
  },
];

export const router = createBrowserRouter(appRoutes);
