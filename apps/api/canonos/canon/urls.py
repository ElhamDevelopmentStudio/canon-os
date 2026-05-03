from __future__ import annotations

from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import CanonSeasonItemDetailView, CanonSeasonViewSet

router = SimpleRouter()
router.register("seasons", CanonSeasonViewSet, basename="canonseason")

urlpatterns = [
    *router.urls,
    path(
        "seasons/<uuid:season_id>/items/<uuid:item_id>/",
        CanonSeasonItemDetailView.as_view(),
        name="canonseasonitem-detail",
    ),
]
