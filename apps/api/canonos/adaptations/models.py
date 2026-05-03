from __future__ import annotations

import inspect
import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from canonos.media.models import MediaItem


def check_constraint_kwargs(condition: models.Q) -> dict[str, models.Q]:
    if "condition" in inspect.signature(models.CheckConstraint).parameters:
        return {"condition": condition}
    return {"check": condition}


class AdaptationRelation(models.Model):
    class RelationType(models.TextChoices):
        SOURCE_TO_ADAPTATION = "source_to_adaptation", "Source to adaptation"
        ADAPTATION_TO_SOURCE = "adaptation_to_source", "Adaptation to source"
        REMAKE = "remake", "Remake"
        ALTERNATE_VERSION = "alternate_version", "Alternate version"
        INSPIRED_BY = "inspired_by", "Inspired by"
        AUDIOBOOK_VERSION = "audiobook_version", "Audiobook version"
        MANGA_TO_ANIME = "manga_to_anime", "Manga to anime"
        NOVEL_TO_FILM = "novel_to_film", "Novel to film"
        NOVEL_TO_SHOW = "novel_to_show", "Novel to show"

    class Completeness(models.TextChoices):
        COMPLETE = "complete", "Complete"
        PARTIAL = "partial", "Partial"
        INCOMPLETE = "incomplete", "Incomplete"
        LOOSE = "loose", "Loose"
        UNKNOWN = "unknown", "Unknown"

    class ExperienceOrder(models.TextChoices):
        READ_FIRST = "read_first", "Read first"
        WATCH_FIRST = "watch_first", "Watch first"
        LISTEN_FIRST = "listen_first", "Listen first"
        ADAPTATION_SUFFICIENT = "adaptation_sufficient", "Adaptation sufficient"
        SOURCE_PREFERRED = "source_preferred", "Source preferred"
        SKIP_ADAPTATION = "skip_adaptation", "Skip adaptation"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="adaptation_relations",
    )
    source_media_item = models.ForeignKey(
        MediaItem,
        on_delete=models.CASCADE,
        related_name="source_adaptation_relations",
    )
    adaptation_media_item = models.ForeignKey(
        MediaItem,
        on_delete=models.CASCADE,
        related_name="adaptation_relations",
    )
    relation_type = models.CharField(
        max_length=48,
        choices=RelationType.choices,
        default=RelationType.SOURCE_TO_ADAPTATION,
    )
    completeness = models.CharField(
        max_length=24,
        choices=Completeness.choices,
        default=Completeness.UNKNOWN,
    )
    faithfulness_score = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    pacing_preservation_score = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    soul_preservation_score = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    recommended_experience_order = models.CharField(
        max_length=32,
        choices=ExperienceOrder.choices,
        default=ExperienceOrder.SOURCE_PREFERRED,
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "source_media_item__title", "adaptation_media_item__title"]
        constraints = [
            models.CheckConstraint(
                **check_constraint_kwargs(
                    ~models.Q(source_media_item=models.F("adaptation_media_item"))
                ),
                name="adapt_relation_distinct_media",
            ),
            models.UniqueConstraint(
                fields=["owner", "source_media_item", "adaptation_media_item", "relation_type"],
                name="adapt_relation_owner_pair_type_uniq",
            ),
        ]
        indexes = [
            models.Index(fields=["owner", "relation_type"], name="adapt_relation_owner_type_idx"),
            models.Index(fields=["source_media_item"], name="adapt_relation_source_idx"),
            models.Index(fields=["adaptation_media_item"], name="adapt_relation_adapt_idx"),
            models.Index(
                fields=["recommended_experience_order"],
                name="adapt_relation_order_idx",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.source_media_item} → {self.adaptation_media_item}"
