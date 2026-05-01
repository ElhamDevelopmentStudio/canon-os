from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models

from canonos.candidates.models import Candidate
from canonos.media.models import MediaItem


class QueueItem(models.Model):
    class Priority(models.TextChoices):
        START_SOON = "start_soon", "Start soon"
        SAMPLE_FIRST = "sample_first", "Sample first"
        LATER = "later", "Later"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="queue_items",
    )
    media_item = models.ForeignKey(
        MediaItem,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="queue_items",
    )
    candidate = models.ForeignKey(
        Candidate,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="queue_items",
    )
    title = models.CharField(max_length=255)
    media_type = models.CharField(max_length=24, choices=MediaItem.MediaType.choices)
    priority = models.CharField(
        max_length=24,
        choices=Priority.choices,
        default=Priority.START_SOON,
    )
    reason = models.TextField(blank=True)
    estimated_time_minutes = models.PositiveIntegerField(null=True, blank=True)
    best_mood = models.CharField(max_length=160, blank=True)
    queue_position = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["queue_position", "-updated_at", "title"]
        indexes = [
            models.Index(
                fields=["owner", "priority", "queue_position"],
                name="queue_owner_priority_idx",
            ),
            models.Index(fields=["media_type"], name="queue_media_type_idx"),
        ]

    def __str__(self) -> str:
        return self.title
