from __future__ import annotations

from django.urls import path

from .views import MediaScoresView, TasteDimensionListView, TasteProfileSummaryView

urlpatterns = [
    path("taste-profile/", TasteProfileSummaryView.as_view(), name="taste-profile-summary"),
    path("taste-dimensions/", TasteDimensionListView.as_view(), name="taste-dimension-list"),
    path("media-items/<uuid:media_id>/scores/", MediaScoresView.as_view(), name="media-score-list"),
]
