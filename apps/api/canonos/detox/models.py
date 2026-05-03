from __future__ import annotations

import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from canonos.media.models import MediaItem


def default_condition() -> dict[str, object]:
    return {}


class DetoxRule(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="detox_rules",
    )
    key = models.SlugField(max_length=80)
    name = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    media_type = models.CharField(
        max_length=24,
        choices=MediaItem.MediaType.choices,
        null=True,
        blank=True,
    )
    sample_limit = models.PositiveIntegerField(default=0)
    condition = models.JSONField(default=default_condition, blank=True)
    is_enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["media_type", "sample_limit", "name"]
        constraints = [
            models.UniqueConstraint(fields=["owner", "key"], name="detox_rule_owner_key_uniq"),
        ]
        indexes = [
            models.Index(fields=["owner", "is_enabled"], name="detox_rule_owner_enabled_idx"),
            models.Index(fields=["owner", "media_type"], name="detox_rule_owner_type_idx"),
        ]

    def __str__(self) -> str:
        return self.name


class DetoxDecision(models.Model):
    class Decision(models.TextChoices):
        DROP = "drop", "Drop"
        PAUSE = "pause", "Pause"
        DELAY = "delay", "Delay"
        ARCHIVE = "archive", "Archive"
        CONTINUE = "continue", "Continue"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    media_item = models.ForeignKey(
        MediaItem,
        on_delete=models.CASCADE,
        related_name="detox_decisions",
    )
    rule = models.ForeignKey(
        DetoxRule,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="decisions",
    )
    decision = models.CharField(max_length=16, choices=Decision.choices)
    reason = models.TextField(blank=True)
    estimated_time_saved_minutes = models.PositiveIntegerField(default=0)
    progress_value = models.PositiveIntegerField(default=0)
    motivation_score = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(10)],
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["media_item", "-created_at"], name="detox_dec_media_idx"),
            models.Index(fields=["decision", "-created_at"], name="detox_dec_kind_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.media_item}: {self.decision}"
