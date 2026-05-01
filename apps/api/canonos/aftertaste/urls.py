from __future__ import annotations

from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import AftertasteEntryViewSet, AftertastePromptView

router = SimpleRouter()
router.register("aftertaste", AftertasteEntryViewSet, basename="aftertasteentry")

urlpatterns = [
    path("aftertaste/prompts/", AftertastePromptView.as_view(), name="aftertaste-prompts"),
    *router.urls,
]
