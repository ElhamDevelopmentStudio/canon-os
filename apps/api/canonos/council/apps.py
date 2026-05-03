from __future__ import annotations

from django.apps import AppConfig


class CouncilConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "canonos.council"
    verbose_name = "Critic Council"
