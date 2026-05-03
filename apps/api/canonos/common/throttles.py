from __future__ import annotations

from rest_framework.settings import api_settings
from rest_framework.throttling import SimpleRateThrottle


class AuthEndpointThrottle(SimpleRateThrottle):
    scope = "auth"

    def get_rate(self):  # noqa: ANN201
        return api_settings.DEFAULT_THROTTLE_RATES.get(self.scope)

    def get_cache_key(self, request, view):  # noqa: ANN001, ANN201
        if request.user and request.user.is_authenticated:
            ident = f"user:{request.user.pk}"
        else:
            ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}


class ExpensiveEndpointThrottle(SimpleRateThrottle):
    scope = "expensive"

    def get_rate(self):  # noqa: ANN201
        return api_settings.DEFAULT_THROTTLE_RATES.get(self.scope)

    def get_cache_key(self, request, view):  # noqa: ANN001, ANN201
        if request.user and request.user.is_authenticated:
            ident = f"user:{request.user.pk}"
        else:
            ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}
