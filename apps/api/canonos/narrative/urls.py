from __future__ import annotations

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import MediaNarrativeAnalysisView, NarrativeAnalysisViewSet

router = DefaultRouter()
router.register("narrative-analyses", NarrativeAnalysisViewSet, basename="narrativeanalysis")

urlpatterns = [
    path("", include(router.urls)),
    path(
        "media-items/<uuid:media_id>/narrative-analysis/",
        MediaNarrativeAnalysisView.as_view(),
        name="media-narrative-analysis",
    ),
]
