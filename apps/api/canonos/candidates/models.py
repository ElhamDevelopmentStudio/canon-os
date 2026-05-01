from __future__ import annotations

import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from canonos.media.models import MediaItem


class Candidate(models.Model):
    class Status(models.TextChoices):
        UNEVALUATED = "unevaluated", "Unevaluated"
        WATCH_NOW = "watch_now", "Watch now"
        SAMPLE = "sample", "Sample"
        DELAY = "delay", "Delay"
        SKIP = "skip", "Skip"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="candidates",
    )
    title = models.CharField(max_length=255)
    media_type = models.CharField(max_length=24, choices=MediaItem.MediaType.choices)
    release_year = models.PositiveSmallIntegerField(null=True, blank=True)
    known_creator = models.CharField(max_length=255, blank=True)
    premise = models.TextField(blank=True)
    source_of_interest = models.CharField(max_length=255, blank=True)
    hype_level = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(10)],
    )
    expected_genericness = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(10)],
    )
    expected_time_cost_minutes = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(
        max_length=24,
        choices=Status.choices,
        default=Status.UNEVALUATED,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "title"]
        indexes = [
            models.Index(fields=["owner", "status"], name="candidate_owner_status_idx"),
            models.Index(fields=["media_type"], name="candidate_media_type_idx"),
        ]

    def __str__(self) -> str:
        return self.title


class CandidateEvaluation(models.Model):
    class Decision(models.TextChoices):
        WATCH_NOW = "watch_now", "Watch now"
        SAMPLE = "sample", "Sample"
        DELAY = "delay", "Delay"
        SKIP = "skip", "Skip"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.ForeignKey(
        Candidate,
        on_delete=models.CASCADE,
        related_name="evaluations",
    )
    decision = models.CharField(max_length=24, choices=Decision.choices)
    confidence_score = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    likely_fit_score = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    risk_score = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    reasons_for = models.JSONField(default=list, blank=True)
    reasons_against = models.JSONField(default=list, blank=True)
    best_mood = models.CharField(max_length=160, blank=True)
    recommended_action = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["candidate", "-created_at"], name="candidate_eval_recent_idx"),
            models.Index(fields=["decision"], name="candidate_eval_decision_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.candidate}: {self.decision}"
