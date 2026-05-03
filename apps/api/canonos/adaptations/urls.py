from __future__ import annotations

from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import AdaptationRelationViewSet, MediaAdaptationMapView

router = SimpleRouter()
router.register("adaptations/relations", AdaptationRelationViewSet, basename="adaptationrelation")

urlpatterns = [
    *router.urls,
    path(
        "media-items/<uuid:media_id>/adaptation-map/",
        MediaAdaptationMapView.as_view(),
        name="mediaitem-adaptation-map",
    ),
    path(
        "media-items/<uuid:media_id>/adaptation-path/",
        MediaAdaptationMapView.as_view(),
        name="mediaitem-adaptation-path",
    ),
]
