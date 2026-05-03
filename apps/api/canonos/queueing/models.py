from __future__ import annotations

import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
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
    mood_compatibility = models.PositiveSmallIntegerField(
        default=50,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    intensity_level = models.PositiveSmallIntegerField(
        default=5,
        validators=[MinValueValidator(0), MaxValueValidator(10)],
    )
    complexity_level = models.PositiveSmallIntegerField(
        default=5,
        validators=[MinValueValidator(0), MaxValueValidator(10)],
    )
    commitment_level = models.PositiveSmallIntegerField(
        default=5,
        validators=[MinValueValidator(0), MaxValueValidator(10)],
    )
    freshness_score = models.FloatField(
        default=100.0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    last_recommended_at = models.DateTimeField(null=True, blank=True)
    times_recommended = models.PositiveIntegerField(default=0)
    is_archived = models.BooleanField(default=False)
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
            models.Index(
                fields=["owner", "is_archived", "queue_position"],
                name="queue_owner_archive_idx",
            ),
        ]

    def __str__(self) -> str:
        return self.title


class TonightModeSession(models.Model):
    class EnergyLevel(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    class FocusLevel(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        DEEP = "deep", "Deep"

    class DesiredEffect(models.TextChoices):
        COMFORT = "comfort", "Comfort"
        QUALITY = "quality", "Quality"
        SURPRISE = "surprise", "Surprise"
        LIGHT = "light", "Light"
        DEEP = "deep", "Deep"

    class RiskTolerance(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tonight_mode_sessions",
    )
    available_minutes = models.PositiveIntegerField()
    energy_level = models.CharField(max_length=16, choices=EnergyLevel.choices)
    focus_level = models.CharField(max_length=16, choices=FocusLevel.choices)
    desired_effect = models.CharField(max_length=24, choices=DesiredEffect.choices)
    preferred_media_types = models.JSONField(default=list, blank=True)
    risk_tolerance = models.CharField(max_length=16, choices=RiskTolerance.choices)
    generated_recommendations = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["owner", "-created_at"], name="tonight_owner_created_idx"),
            models.Index(fields=["energy_level", "focus_level"], name="tonight_energy_focus_idx"),
        ]

    def __str__(self) -> str:
        return f"Tonight Mode for {self.owner} at {self.created_at:%Y-%m-%d %H:%M}"
