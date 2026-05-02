from __future__ import annotations

from django.apps import AppConfig


class MetadataConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "canonos.metadata"
