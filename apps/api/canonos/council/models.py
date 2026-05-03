from __future__ import annotations

import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from canonos.candidates.models import Candidate, CandidateEvaluation
from canonos.media.models import MediaItem


class CriticPersona(models.Model):
    class Role(models.TextChoices):
        RUTHLESS_CRITIC = "ruthless_critic", "Ruthless Critic"
        HISTORIAN = "historian", "Historian"
        MODERN_DEFENDER = "modern_defender", "Modern Defender"
        ANIME_SPECIALIST = "anime_specialist", "Anime Specialist"
        LITERARY_EDITOR = "literary_editor", "Literary Editor"
        MOOD_DOCTOR = "mood_doctor", "Mood Doctor"
        COMPLETION_STRATEGIST = "completion_strategist", "Completion Strategist"
        WILDCARD = "wildcard", "Wildcard"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="critic_personas",
    )
    key = models.SlugField(max_length=80)
    name = models.CharField(max_length=120)
    role = models.CharField(max_length=40, choices=Role.choices)
    description = models.TextField(blank=True)
    weight = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    is_enabled = models.BooleanField(default=True)
    sort_order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "key"],
                name="critic_persona_owner_key_uniq",
            ),
            models.UniqueConstraint(
                fields=["owner", "role"],
                name="critic_persona_owner_role_uniq",
            ),
        ]
        indexes = [
            models.Index(fields=["owner", "is_enabled"], name="critic_persona_enabled_idx"),
            models.Index(fields=["role"], name="critic_persona_role_idx"),
        ]

    def __str__(self) -> str:
        return self.name


class CouncilSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="council_sessions",
    )
    candidate = models.ForeignKey(
        Candidate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="council_sessions",
    )
    media_item = models.ForeignKey(
        MediaItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="council_sessions",
    )
    prompt = models.TextField(blank=True)
    context = models.JSONField(default=dict, blank=True)
    critic_opinions = models.JSONField(default=list, blank=True)
    final_decision = models.CharField(
        max_length=24,
        choices=CandidateEvaluation.Decision.choices,
        default=CandidateEvaluation.Decision.DELAY,
    )
    final_explanation = models.TextField(blank=True)
    confidence_score = models.PositiveSmallIntegerField(
        default=50,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    disagreement_score = models.PositiveSmallIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    applied_to_candidate = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["owner", "-created_at"], name="council_owner_recent_idx"),
            models.Index(fields=["candidate", "-created_at"], name="council_candidate_recent_idx"),
            models.Index(fields=["media_item", "-created_at"], name="council_media_recent_idx"),
        ]

    def __str__(self) -> str:
        if self.candidate:
            target = self.candidate.title
        elif self.media_item:
            target = self.media_item.title
        else:
            target = "freeform"
        return f"Critic Council: {target}"
