from __future__ import annotations

from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import (
    DetoxDecisionListView,
    DetoxEvaluateView,
    DetoxRuleViewSet,
    DetoxTimeSavedSummaryView,
)

router = SimpleRouter()
router.register("detox/rules", DetoxRuleViewSet, basename="detox-rule")

urlpatterns = [
    path("detox/evaluate/", DetoxEvaluateView.as_view(), name="detox-evaluate"),
    path("detox/decisions/", DetoxDecisionListView.as_view(), name="detox-decision-list"),
    path("detox/time-saved/", DetoxTimeSavedSummaryView.as_view(), name="detox-time-saved"),
    *router.urls,
]
