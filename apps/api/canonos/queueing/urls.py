from __future__ import annotations

from rest_framework.routers import SimpleRouter

from .views import QueueItemViewSet

router = SimpleRouter()
router.register("queue-items", QueueItemViewSet, basename="queueitem")

urlpatterns = router.urls
