from __future__ import annotations

from django.apps import AppConfig


class GraphConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "canonos.graph"
    verbose_name = "TasteGraph"
