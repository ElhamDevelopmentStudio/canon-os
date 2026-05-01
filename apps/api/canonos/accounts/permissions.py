from __future__ import annotations

from rest_framework.permissions import IsAuthenticated


class IsAuthenticatedUser(IsAuthenticated):
    message = "Authentication is required to access this CanonOS resource."
