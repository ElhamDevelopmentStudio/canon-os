from __future__ import annotations

import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from canonos.taste.defaults import SCORE_MAX, SCORE_MIN


class TasteDimension(models.Model):
    class Direction(models.TextChoices):
        POSITIVE = "positive", "Positive"
        NEGATIVE = "negative", "Negative"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="taste_dimensions",
    )
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=80)
    description = models.TextField(blank=True)
    direction = models.CharField(
        max_length=16,
        choices=Direction.choices,
        default=Direction.POSITIVE,
    )
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "slug"],
                name="taste_dimension_owner_slug_uniq",
            ),
        ]
        indexes = [
            models.Index(fields=["owner", "is_default"], name="taste_dim_owner_default_idx"),
            models.Index(fields=["slug"], name="taste_dimension_slug_idx"),
        ]

    def __str__(self) -> str:
        return self.name


class MediaScore(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    media_item = models.ForeignKey(
        "media.MediaItem",
        on_delete=models.CASCADE,
        related_name="scores",
    )
    taste_dimension = models.ForeignKey(
        TasteDimension,
        on_delete=models.CASCADE,
        related_name="media_scores",
    )
    score = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        validators=[MinValueValidator(SCORE_MIN), MaxValueValidator(SCORE_MAX)],
    )
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["taste_dimension__name"]
        constraints = [
            models.UniqueConstraint(
                fields=["media_item", "taste_dimension"],
                name="media_score_item_dimension_uniq",
            ),
        ]
        indexes = [
            models.Index(fields=["media_item"], name="media_score_item_idx"),
            models.Index(fields=["taste_dimension"], name="media_score_dimension_idx"),
            models.Index(fields=["taste_dimension", "score"], name="media_score_dim_score_idx"),
            models.Index(fields=["media_item", "updated_at"], name="media_score_item_updated_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.media_item}: {self.taste_dimension} = {self.score}"
