import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { APP_ROUTES } from "@/app/routeConstants";
import { LoadingState } from "@/components/feedback/LoadingState";
import { useAuthStore } from "@/stores/authStore";

export function ProtectedRoute() {
  const status = useAuthStore((state) => state.status);
  const fetchCurrentUser = useAuthStore((state) => state.fetchCurrentUser);
  const location = useLocation();

  useEffect(() => {
    if (status === "idle") {
      void fetchCurrentUser();
    }
  }, [fetchCurrentUser, status]);

  if (status === "idle" || status === "loading") {
    return <LoadingState title="Checking session" message="Confirming your private CanonOS session." />;
  }

  if (status === "unauthenticated") {
    return <Navigate replace state={{ from: location }} to={APP_ROUTES.login} />;
  }

  return <Outlet />;
}
