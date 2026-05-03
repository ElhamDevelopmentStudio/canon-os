from __future__ import annotations

from rest_framework.routers import SimpleRouter

from .views import CouncilSessionViewSet, CriticPersonaViewSet

router = SimpleRouter()
router.register("critic-personas", CriticPersonaViewSet, basename="critic-persona")
router.register("council-sessions", CouncilSessionViewSet, basename="council-session")

urlpatterns = [*router.urls]
