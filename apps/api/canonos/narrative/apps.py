from __future__ import annotations

from django.apps import AppConfig


class NarrativeConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "canonos.narrative"
    verbose_name = "Narrative DNA"
