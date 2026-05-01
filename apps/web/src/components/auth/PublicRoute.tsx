import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";

import { APP_ROUTES } from "@/app/routeConstants";
import { LoadingState } from "@/components/feedback/LoadingState";
import { useAuthStore } from "@/stores/authStore";

export function PublicRoute() {
  const status = useAuthStore((state) => state.status);
  const fetchCurrentUser = useAuthStore((state) => state.fetchCurrentUser);

  useEffect(() => {
    if (status === "idle") {
      void fetchCurrentUser();
    }
  }, [fetchCurrentUser, status]);

  if (status === "idle" || status === "loading") {
    return <LoadingState title="Checking session" message="Preparing the sign-in flow." />;
  }

  if (status === "authenticated") {
    return <Navigate replace to={APP_ROUTES.dashboard} />;
  }

  return <Outlet />;
}
