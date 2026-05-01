from __future__ import annotations

from rest_framework.routers import SimpleRouter

from .views import MediaItemViewSet

router = SimpleRouter()
router.register("media-items", MediaItemViewSet, basename="mediaitem")

urlpatterns = router.urls
