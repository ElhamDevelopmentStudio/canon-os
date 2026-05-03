from __future__ import annotations

from django.urls import path

from .views import TasteEvolutionGenerateView, TasteEvolutionTimelineView

urlpatterns = [
    path("taste-evolution/", TasteEvolutionTimelineView.as_view(), name="taste-evolution-timeline"),
    path(
        "taste-evolution/generate/",
        TasteEvolutionGenerateView.as_view(),
        name="taste-evolution-generate",
    ),
]
