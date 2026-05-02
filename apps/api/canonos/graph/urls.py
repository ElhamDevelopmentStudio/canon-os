from __future__ import annotations

from django.urls import path

from .views import (
    GraphEdgeListView,
    GraphNodeListView,
    TasteGraphRebuildView,
    TasteGraphSummaryView,
)

urlpatterns = [
    path("taste-graph/summary/", TasteGraphSummaryView.as_view(), name="taste-graph-summary"),
    path("taste-graph/nodes/", GraphNodeListView.as_view(), name="taste-graph-node-list"),
    path("taste-graph/edges/", GraphEdgeListView.as_view(), name="taste-graph-edge-list"),
    path("taste-graph/rebuild/", TasteGraphRebuildView.as_view(), name="taste-graph-rebuild"),
]
