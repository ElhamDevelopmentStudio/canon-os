from __future__ import annotations

from django.apps import AppConfig


class AntiGenericConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "canonos.anti_generic"
    verbose_name = "Anti-Generic Filter"
