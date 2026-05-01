from __future__ import annotations

from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import QueueItemViewSet, TonightModeView

router = SimpleRouter()
router.register("queue-items", QueueItemViewSet, basename="queueitem")

urlpatterns = [
    path("queue/tonight/", TonightModeView.as_view(), name="tonightmode-generate"),
    *router.urls,
]
