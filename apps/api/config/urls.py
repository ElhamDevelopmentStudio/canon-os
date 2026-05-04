from __future__ import annotations

from django.contrib import admin
from django.http import HttpRequest, HttpResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from .api_root import ApiRootView, ApiV1RootView


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


def build_api_urlpatterns(root_view, root_name: str):  # noqa: ANN001, ANN201
    return [
        path("", root_view.as_view(), name=root_name),
        path("auth/", include("canonos.accounts.urls")),
        path("", include("canonos.adaptations.urls")),
        path("", include("canonos.analytics.urls")),
        path("", include("canonos.anti_generic.urls")),
        path("", include("canonos.aftertaste.urls")),
        path("", include("canonos.candidates.urls")),
        path("", include("canonos.canon.urls")),
        path("", include("canonos.council.urls")),
        path("", include("canonos.dashboard.urls")),
        path("", include("canonos.detox.urls")),
        path("", include("canonos.discovery.urls")),
        path("", include("canonos.evolution.urls")),
        path("health/", include("canonos.health.urls")),
        path("", include("canonos.graph.urls")),
        path("", include("canonos.imports.urls")),
        path("", include("canonos.jobs.urls")),
        path("", include("canonos.media.urls")),
        path("", include("canonos.metadata.urls")),
        path("", include("canonos.narrative.urls")),
        path("", include("canonos.queueing.urls")),
        path("", include("canonos.search.urls")),
        path("", include("canonos.taste.urls")),
        path("schema/", SpectacularAPIView.as_view(), name="schema"),
        path("docs/swagger/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
        path("docs/scalar/", scalar_docs, name="scalar-docs"),
    ]


api_urlpatterns = build_api_urlpatterns(ApiRootView, "api-root")
api_v1_urlpatterns = build_api_urlpatterns(ApiV1RootView, "api-v1-root")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(api_urlpatterns)),
    path("api/v1/", include(api_v1_urlpatterns)),
]
