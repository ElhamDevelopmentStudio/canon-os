from __future__ import annotations

from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import DiscoveryGenerateView, DiscoveryTrailViewSet

router = SimpleRouter()
router.register("discovery/trails", DiscoveryTrailViewSet, basename="discoverytrail")

urlpatterns = [
    path("discovery/generate/", DiscoveryGenerateView.as_view(), name="discovery-generate"),
    *router.urls,
]
