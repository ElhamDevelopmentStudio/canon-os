from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models

from canonos.candidates.models import Candidate
from canonos.media.models import MediaItem


class CanonSeason(models.Model):
    class Theme(models.TextChoices):
        MORAL_COLLAPSE = "moral_collapse", "Moral collapse"
        ANTI_HEROES_DONE_RIGHT = "anti_heroes_done_right", "Anti-heroes done right"
        FORGOTTEN_MASTERPIECES = "forgotten_masterpieces", "Forgotten masterpieces"
        MODERN_WORKS_WORTH_IT = "modern_works_worth_it", "Modern works worth it"
        ATMOSPHERE_OVER_PLOT = "atmosphere_over_plot", "Atmosphere over plot"
        CUSTOM = "custom", "Custom"

    class Status(models.TextChoices):
        PLANNED = "planned", "Planned"
        ACTIVE = "active", "Active"
        PAUSED = "paused", "Paused"
        COMPLETED = "completed", "Completed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="canon_seasons",
    )
    title = models.CharField(max_length=255)
    theme = models.CharField(max_length=48, choices=Theme.choices, default=Theme.CUSTOM)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.PLANNED)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    reflection_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "title"]
        indexes = [
            models.Index(fields=["owner", "status"], name="canon_season_owner_status_idx"),
            models.Index(fields=["theme"], name="canon_season_theme_idx"),
        ]

    def __str__(self) -> str:
        return self.title


class CanonSeasonItem(models.Model):
    class CompletionStatus(models.TextChoices):
        PLANNED = "planned", "Planned"
        IN_PROGRESS = "in_progress", "In progress"
        COMPLETED = "completed", "Completed"
        SKIPPED = "skipped", "Skipped"

    class CanonStatus(models.TextChoices):
        UNMARKED = "unmarked", "Unmarked"
        PERSONAL_CANON = "personal_canon", "Personal canon"
        NEAR_CANON = "near_canon", "Near-canon"
        REJECTED = "rejected", "Rejected"
        HISTORICALLY_IMPORTANT = "historically_important", "Historically important, not loved"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    season = models.ForeignKey(
        CanonSeason,
        on_delete=models.CASCADE,
        related_name="items",
    )
    media_item = models.ForeignKey(
        MediaItem,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="canon_season_items",
    )
    candidate = models.ForeignKey(
        Candidate,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="canon_season_items",
    )
    title_snapshot = models.CharField(max_length=255)
    media_type = models.CharField(max_length=24, choices=MediaItem.MediaType.choices)
    order = models.PositiveIntegerField(default=1)
    reason_included = models.TextField(blank=True)
    what_to_pay_attention_to = models.TextField(blank=True)
    completion_status = models.CharField(
        max_length=24,
        choices=CompletionStatus.choices,
        default=CompletionStatus.PLANNED,
    )
    canon_status = models.CharField(
        max_length=32,
        choices=CanonStatus.choices,
        default=CanonStatus.UNMARKED,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "created_at", "title_snapshot"]
        indexes = [
            models.Index(fields=["season", "order"], name="canon_item_season_order_idx"),
            models.Index(fields=["completion_status"], name="canon_item_status_idx"),
            models.Index(fields=["canon_status"], name="canon_item_canon_status_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.season}: {self.title_snapshot}"
