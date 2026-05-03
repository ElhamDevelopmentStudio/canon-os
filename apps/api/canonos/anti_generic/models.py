from __future__ import annotations

import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from canonos.candidates.models import Candidate
from canonos.media.models import MediaItem


class AntiGenericRule(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="anti_generic_rules",
    )
    key = models.SlugField(max_length=80)
    name = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    weight = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    is_positive_exception = models.BooleanField(default=False)
    is_enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["is_positive_exception", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "key"],
                name="anti_generic_rule_owner_key_uniq",
            ),
        ]
        indexes = [
            models.Index(fields=["owner", "is_enabled"], name="ag_rule_owner_enabled_idx"),
            models.Index(fields=["key"], name="ag_rule_key_idx"),
        ]

    def __str__(self) -> str:
        return self.name


class AntiGenericEvaluation(models.Model):
    class FinalVerdict(models.TextChoices):
        LOW_RISK = "low_risk", "Low risk"
        SAMPLE_WITH_GUARDRAIL = "sample_with_guardrail", "Sample with guardrail"
        LIKELY_GENERIC_SKIP = "likely_generic_skip", "Likely generic skip"
        MODERN_EXCEPTION = "modern_exception", "Modern exception"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.ForeignKey(
        Candidate,
        on_delete=models.CASCADE,
        related_name="anti_generic_evaluations",
    )
    media_item = models.ForeignKey(
        MediaItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="anti_generic_evaluations",
    )
    genericness_risk_score = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    time_waste_risk_score = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    positive_exception_score = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    detected_signals = models.JSONField(default=list, blank=True)
    positive_exceptions = models.JSONField(default=list, blank=True)
    final_verdict = models.CharField(max_length=40, choices=FinalVerdict.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["candidate", "-created_at"], name="ag_eval_candidate_recent_idx"),
            models.Index(fields=["final_verdict"], name="ag_eval_verdict_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.candidate}: {self.final_verdict}"
