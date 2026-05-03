from __future__ import annotations

import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from canonos.media.models import MediaItem


class NarrativeAnalysis(models.Model):
    class Status(models.TextChoices):
        QUEUED = "queued", "Queued"
        RUNNING = "running", "Running"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    class SourceBasis(models.TextChoices):
        USER_NOTES = "user_notes", "User notes"
        METADATA = "metadata", "Metadata"
        MANUAL_ANALYSIS = "manual_analysis", "Manual analysis"
        MIXED_NOTES_METADATA = "mixed_notes_metadata", "Mixed notes and metadata"
        MANUAL_CORRECTION = "manual_correction", "Manual correction"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="narrative_analyses",
    )
    media_item = models.ForeignKey(
        MediaItem,
        on_delete=models.CASCADE,
        related_name="narrative_analyses",
    )
    status = models.CharField(
        max_length=24,
        choices=Status.choices,
        default=Status.QUEUED,
    )
    character_complexity_score = models.PositiveSmallIntegerField(
        default=50,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    plot_complexity_score = models.PositiveSmallIntegerField(
        default=50,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    pacing_density_score = models.PositiveSmallIntegerField(
        default=50,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    thematic_weight_score = models.PositiveSmallIntegerField(
        default=50,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    moral_ambiguity_score = models.PositiveSmallIntegerField(
        default=50,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    atmosphere_score = models.PositiveSmallIntegerField(
        default=50,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    ending_dependency_score = models.PositiveSmallIntegerField(
        default=50,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    trope_freshness_score = models.PositiveSmallIntegerField(
        default=50,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    confidence_score = models.PositiveSmallIntegerField(
        default=35,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    analysis_summary = models.TextField(blank=True)
    extracted_traits = models.JSONField(default=list, blank=True)
    evidence_notes = models.TextField(blank=True)
    source_basis = models.CharField(
        max_length=32,
        choices=SourceBasis.choices,
        default=SourceBasis.USER_NOTES,
    )
    provider = models.CharField(max_length=64, default="local_heuristic")
    algorithm_version = models.CharField(max_length=32, default="narrative-dna-v1")
    status_events = models.JSONField(default=list, blank=True)
    error_message = models.TextField(blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "media_item"],
                name="narrative_owner_media_unique",
            ),
        ]
        indexes = [
            models.Index(fields=["owner", "status"], name="narrative_owner_status_idx"),
            models.Index(fields=["media_item", "-updated_at"], name="narrative_media_recent_idx"),
        ]

    def __str__(self) -> str:
        return f"Narrative DNA for {self.media_item}"
