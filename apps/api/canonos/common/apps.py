from __future__ import annotations

from django.apps import AppConfig


class CommonConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "canonos.common"

    def ready(self) -> None:
        from . import checks  # noqa: F401
