import { createBrowserRouter, type RouteObject } from "react-router-dom";

import { AppLayout } from "@/app/layouts/AppLayout";
import { AftertasteLogPage } from "@/pages/AftertasteLogPage";
import { APP_ROUTES } from "@/app/routeConstants";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PublicRoute } from "@/components/auth/PublicRoute";
import { DashboardPage } from "@/pages/DashboardPage";
import { CandidateEvaluatorPage } from "@/pages/CandidateEvaluatorPage";
import { LibraryPage } from "@/pages/LibraryPage";
import { LoginPage } from "@/pages/LoginPage";
import { MediaDetailPage } from "@/pages/MediaDetailPage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import { QueuePage } from "@/pages/QueuePage";
import { TonightModePage } from "@/pages/TonightModePage";
import { RegisterPage } from "@/pages/RegisterPage";

export const protectedRouteChildren: RouteObject[] = [
  { index: true, element: <DashboardPage /> },
  { path: APP_ROUTES.library.slice(1), element: <LibraryPage /> },
  { path: "library/:mediaId", element: <MediaDetailPage /> },
  { path: APP_ROUTES.candidates.slice(1), element: <CandidateEvaluatorPage /> },
  { path: APP_ROUTES.tonight.slice(1), element: <TonightModePage /> },
  { path: APP_ROUTES.tasteProfile.slice(1), element: <PlaceholderPage route={APP_ROUTES.tasteProfile} /> },
  { path: APP_ROUTES.aftertasteLog.slice(1), element: <AftertasteLogPage /> },
  { path: APP_ROUTES.queue.slice(1), element: <QueuePage /> },
  { path: APP_ROUTES.settings.slice(1), element: <PlaceholderPage route={APP_ROUTES.settings} /> },
];

export const appRoutes: RouteObject[] = [
  {
    element: <PublicRoute />,
    children: [
      { path: APP_ROUTES.login, element: <LoginPage /> },
      { path: APP_ROUTES.register, element: <RegisterPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: APP_ROUTES.dashboard,
        element: <AppLayout />,
        children: protectedRouteChildren,
      },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(appRoutes);
}

export const router = createAppRouter();
