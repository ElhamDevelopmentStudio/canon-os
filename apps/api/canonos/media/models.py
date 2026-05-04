from __future__ import annotations

import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models.functions import Lower


class MediaItem(models.Model):
    class MediaType(models.TextChoices):
        MOVIE = "movie", "Movie"
        TV_SHOW = "tv_show", "TV show"
        ANIME = "anime", "Anime"
        NOVEL = "novel", "Novel"
        AUDIOBOOK = "audiobook", "Audiobook"

    class ConsumptionStatus(models.TextChoices):
        PLANNED = "planned", "Planned"
        CONSUMING = "consuming", "Consuming"
        COMPLETED = "completed", "Completed"
        PAUSED = "paused", "Paused"
        DROPPED = "dropped", "Dropped"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="media_items",
    )
    title = models.CharField(max_length=255)
    original_title = models.CharField(max_length=255, blank=True)
    media_type = models.CharField(max_length=24, choices=MediaType.choices)
    release_year = models.PositiveSmallIntegerField(null=True, blank=True)
    country_language = models.CharField(max_length=120, blank=True)
    creator = models.CharField(max_length=255, blank=True)
    status = models.CharField(
        max_length=24,
        choices=ConsumptionStatus.choices,
        default=ConsumptionStatus.PLANNED,
    )
    personal_rating = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(10)],
    )
    started_date = models.DateField(null=True, blank=True)
    completed_date = models.DateField(null=True, blank=True)
    runtime_minutes = models.PositiveIntegerField(null=True, blank=True)
    episode_count = models.PositiveIntegerField(null=True, blank=True)
    page_count = models.PositiveIntegerField(null=True, blank=True)
    audiobook_length_minutes = models.PositiveIntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "title"]
        indexes = [
            models.Index(fields=["owner", "status"], name="media_owner_status_idx"),
            models.Index(
                fields=["owner", "media_type", "status"], name="media_owner_type_status_idx"
            ),
            models.Index(fields=["owner", "-updated_at"], name="media_owner_updated_idx"),
            models.Index(fields=["owner", "completed_date"], name="media_owner_completed_idx"),
            models.Index(fields=["owner", "personal_rating"], name="media_owner_rating_idx"),
            models.Index(fields=["media_type"], name="media_type_idx"),
            models.Index(Lower("title"), name="media_title_lower_idx"),
        ]

    def __str__(self) -> str:
        return self.title
