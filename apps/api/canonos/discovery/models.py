from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models

from canonos.media.models import MediaItem


class DiscoveryTrail(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="discovery_trails",
    )
    name = models.CharField(max_length=255)
    theme = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    source_media_item = models.ForeignKey(
        MediaItem,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="discovery_trails",
    )
    result_items = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "name"]
        indexes = [
            models.Index(fields=["owner", "-created_at"], name="discovery_owner_created_idx"),
            models.Index(fields=["theme"], name="discovery_theme_idx"),
        ]

    def __str__(self) -> str:
        return self.name
