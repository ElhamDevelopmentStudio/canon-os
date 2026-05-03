from __future__ import annotations

from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import AntiGenericEvaluateView, AntiGenericRuleViewSet

router = SimpleRouter()
router.register("anti-generic/rules", AntiGenericRuleViewSet, basename="anti-generic-rule")

urlpatterns = [
    path("anti-generic/evaluate/", AntiGenericEvaluateView.as_view(), name="anti-generic-evaluate"),
    *router.urls,
]
