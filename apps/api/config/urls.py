from __future__ import annotations

from django.contrib import admin
from django.http import HttpRequest, HttpResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from .api_root import ApiRootView


def scalar_docs(_: HttpRequest) -> HttpResponse:
    html = """
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CanonOS API Docs</title>
  </head>
  <body>
    <script id="api-reference" data-url="/api/schema/"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>
"""
    return HttpResponse(html)


api_urlpatterns = [
    path("", ApiRootView.as_view(), name="api-root"),
    path("auth/", include("canonos.accounts.urls")),
    path("", include("canonos.aftertaste.urls")),
    path("", include("canonos.candidates.urls")),
    path("", include("canonos.dashboard.urls")),
    path("health/", include("canonos.health.urls")),
    path("", include("canonos.imports.urls")),
    path("", include("canonos.media.urls")),
    path("", include("canonos.queueing.urls")),
    path("", include("canonos.taste.urls")),
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
    path("docs/swagger/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("docs/scalar/", scalar_docs, name="scalar-docs"),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(api_urlpatterns)),
    path("api/v1/", include(api_urlpatterns)),
]
