from __future__ import annotations

import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from canonos.media.models import MediaItem


class AftertasteEntry(models.Model):
    class AppetiteEffect(models.TextChoices):
        MORE_LIKE_THIS = "more_like_this", "More like this"
        LESS_LIKE_THIS = "less_like_this", "Less like this"
        ONLY_IN_MOOD = "only_in_mood", "Only in the right mood"
        NO_CHANGE = "no_change", "No change"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="aftertaste_entries",
    )
    media_item = models.ForeignKey(
        MediaItem,
        on_delete=models.CASCADE,
        related_name="aftertaste_entries",
    )
    worth_time = models.BooleanField(default=True)
    stayed_with_me_score = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(10)]
    )
    felt_alive = models.BooleanField(default=False)
    felt_generic = models.BooleanField(default=False)
    completion_reason = models.CharField(max_length=255, blank=True)
    what_worked = models.TextField(blank=True)
    what_failed = models.TextField(blank=True)
    final_thoughts = models.TextField(blank=True)
    appetite_effect = models.CharField(
        max_length=24,
        choices=AppetiteEffect.choices,
        default=AppetiteEffect.NO_CHANGE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["owner", "-created_at"], name="aftertaste_owner_created_idx"),
            models.Index(fields=["media_item", "-created_at"], name="aftertaste_media_created_idx"),
            models.Index(fields=["appetite_effect"], name="aftertaste_appetite_idx"),
        ]

    def __str__(self) -> str:
        return f"Aftertaste for {self.media_item}"
