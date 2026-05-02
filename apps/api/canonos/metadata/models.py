from __future__ import annotations

import uuid

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models.functions import Lower
from django.utils import timezone

from canonos.media.models import MediaItem


class ExternalMetadata(models.Model):
    class ExternalProvider(models.TextChoices):
        MANUAL = "manual", "Manual"
        MOVIE_TV = "movie_tv", "Movie/TV provider"
        ANIME = "anime", "Anime provider"
        BOOK = "book", "Book provider"
        AUDIOBOOK = "audiobook", "Audiobook provider"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    media_item = models.ForeignKey(
        MediaItem,
        on_delete=models.CASCADE,
        related_name="external_metadata",
    )
    provider = models.CharField(max_length=32, choices=ExternalProvider.choices)
    provider_item_id = models.CharField(max_length=255)
    raw_payload = models.JSONField(default=dict, blank=True)
    normalized_title = models.CharField(max_length=255)
    normalized_description = models.TextField(blank=True)
    image_url = models.URLField(blank=True)
    source_url = models.URLField(blank=True)
    external_rating = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(10)],
    )
    external_popularity = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    last_refreshed_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-last_refreshed_at", "provider"]
        constraints = [
            models.UniqueConstraint(
                fields=["media_item", "provider", "provider_item_id"],
                name="unique_media_external_metadata",
            ),
        ]
        indexes = [
            models.Index(fields=["provider", "provider_item_id"], name="metadata_provider_id_idx"),
            models.Index(fields=["media_item", "provider"], name="metadata_media_provider_idx"),
            models.Index(Lower("normalized_title"), name="metadata_title_lower_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.normalized_title} ({self.provider})"
