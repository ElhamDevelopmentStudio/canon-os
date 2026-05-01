from __future__ import annotations

from decimal import Decimal
from typing import Any

from django.contrib.auth.models import User
from django.db.models import Avg, Count, F, Q
from django.utils import timezone

from canonos.aftertaste.models import AftertasteEntry
from canonos.media.models import MediaItem

from .defaults import DEFAULT_TASTE_DIMENSIONS
from .models import MediaScore, TasteDimension

HIGH_WARNING_THRESHOLD = Decimal("7.0")


def seed_default_taste_dimensions(user: User) -> list[TasteDimension]:
    dimensions: list[TasteDimension] = []
    for definition in DEFAULT_TASTE_DIMENSIONS:
        dimension, _ = TasteDimension.objects.update_or_create(
            owner=user,
            slug=definition["slug"],
            defaults={
                "name": definition["name"],
                "description": definition["description"],
                "direction": definition["direction"],
                "is_default": True,
            },
        )
        dimensions.append(dimension)
    return dimensions


def build_taste_profile_summary(user: User) -> dict[str, Any]:
    seed_default_taste_dimensions(user)
    media = MediaItem.objects.filter(owner=user)
    scores = MediaScore.objects.filter(media_item__owner=user).select_related(
        "media_item",
        "taste_dimension",
    )
    aftertaste_entries = AftertasteEntry.objects.filter(owner=user).select_related("media_item")

    evidence_counts = {
        "mediaCount": media.count(),
        "scoredMediaCount": scores.values("media_item_id").distinct().count(),
        "scoreCount": scores.count(),
        "aftertasteCount": aftertaste_entries.count(),
    }
    dimension_signals = _dimension_signals(scores)
    positive_signals = [
        signal
        for signal in dimension_signals
        if signal["dimensionDirection"] == TasteDimension.Direction.POSITIVE
    ]
    negative_dimension_signals = [
        signal
        for signal in dimension_signals
        if signal["dimensionDirection"] == TasteDimension.Direction.NEGATIVE
    ]
    strongest_dimensions = sorted(
        positive_signals,
        key=lambda signal: (
            -signal["averageScore"],
            -signal["scoreCount"],
            signal["dimensionName"],
        ),
    )[:5]
    weakest_dimensions = (
        sorted(
            positive_signals,
            key=lambda signal: (
                signal["averageScore"],
                -signal["scoreCount"],
                signal["dimensionName"],
            ),
        )[:3]
        + sorted(
            negative_dimension_signals,
            key=lambda signal: (
                -signal["averageScore"],
                -signal["scoreCount"],
                signal["dimensionName"],
            ),
        )[:2]
    )[:5]
    medium_preferences = _medium_preferences(user)
    strongest_medium = _strongest_medium(medium_preferences)
    weakest_medium = _weakest_medium(medium_preferences)
    negative_signals = _negative_signals(scores, aftertaste_entries)
    influential_works = _recently_influential_works(aftertaste_entries, media)
    confidence = _confidence(evidence_counts)
    is_empty = evidence_counts["scoreCount"] == 0 and evidence_counts["aftertasteCount"] == 0

    return {
        "generatedSummary": _generated_summary(
            is_empty=is_empty,
            confidence=confidence,
            strongest_dimensions=strongest_dimensions,
            weakest_dimensions=weakest_dimensions,
            strongest_medium=strongest_medium,
            negative_signals=negative_signals,
        ),
        "isEmpty": is_empty,
        "confidence": confidence,
        "evidenceCounts": evidence_counts,
        "strongestDimensions": strongest_dimensions,
        "weakestDimensions": weakest_dimensions,
        "negativeSignals": negative_signals,
        "mediumPreferences": medium_preferences,
        "strongestMediumPreference": strongest_medium,
        "weakestMediumPreference": weakest_medium,
        "recentlyInfluentialWorks": influential_works,
        "generatedAt": timezone.now().isoformat().replace("+00:00", "Z"),
    }


def _dimension_signals(scores) -> list[dict[str, object]]:  # noqa: ANN001
    return [
        {
            "dimensionSlug": row["dimensionSlug"],
            "dimensionName": row["dimensionName"],
            "dimensionDirection": row["dimensionDirection"],
            "averageScore": round(float(row["averageScore"]), 1),
            "scoreCount": row["scoreCount"],
            "evidenceLabel": _evidence_label(row["scoreCount"], "score"),
        }
        for row in scores.values(
            dimensionSlug=F("taste_dimension__slug"),
            dimensionName=F("taste_dimension__name"),
            dimensionDirection=F("taste_dimension__direction"),
        )
        .annotate(averageScore=Avg("score"), scoreCount=Count("id"))
        .order_by("taste_dimension__name")
    ]


def _medium_preferences(user: User) -> list[dict[str, object]]:
    score_counts = {
        row["media_item__media_type"]: row["scoreCount"]
        for row in MediaScore.objects.filter(media_item__owner=user)
        .values("media_item__media_type")
        .annotate(scoreCount=Count("id"))
    }
    return [
        {
            "mediaType": row["media_type"],
            "averageRating": None
            if row["averageRating"] is None
            else round(float(row["averageRating"]), 1),
            "mediaCount": row["mediaCount"],
            "completedCount": row["completedCount"],
            "scoreCount": score_counts.get(row["media_type"], 0),
        }
        for row in MediaItem.objects.filter(owner=user)
        .values("media_type")
        .annotate(
            averageRating=Avg("personal_rating"),
            mediaCount=Count("id"),
            completedCount=Count("id", filter=Q(status=MediaItem.ConsumptionStatus.COMPLETED)),
        )
        .order_by("media_type")
    ]


def _strongest_medium(preferences: list[dict[str, object]]) -> dict[str, object] | None:
    rated = [preference for preference in preferences if preference["averageRating"] is not None]
    if not rated:
        return None
    return sorted(
        rated,
        key=lambda preference: (
            -float(preference["averageRating"] or 0),
            -int(preference["completedCount"]),
            -int(preference["scoreCount"]),
            str(preference["mediaType"]),
        ),
    )[0]


def _weakest_medium(preferences: list[dict[str, object]]) -> dict[str, object] | None:
    rated = [preference for preference in preferences if preference["averageRating"] is not None]
    if not rated:
        return None
    return sorted(
        rated,
        key=lambda preference: (
            float(preference["averageRating"] or 0),
            -int(preference["completedCount"]),
            -int(preference["scoreCount"]),
            str(preference["mediaType"]),
        ),
    )[0]


def _negative_signals(scores, aftertaste_entries) -> list[dict[str, object]]:  # noqa: ANN001
    genericness_scores = scores.filter(taste_dimension__slug="genericness")
    regret_scores = scores.filter(taste_dimension__slug="regret_score")
    genericness_warning_count = (
        genericness_scores.filter(score__gte=HIGH_WARNING_THRESHOLD).count()
        + aftertaste_entries.filter(felt_generic=True).count()
    )
    regret_warning_count = (
        regret_scores.filter(score__gte=HIGH_WARNING_THRESHOLD).count()
        + aftertaste_entries.filter(worth_time=False).count()
    )
    return [
        {
            "slug": "genericness",
            "label": "Genericness warning",
            "warningCount": genericness_warning_count,
            "averageScore": _average_score(genericness_scores),
            "evidenceLabel": _evidence_label(genericness_warning_count, "warning"),
        },
        {
            "slug": "regret_score",
            "label": "Regret warning",
            "warningCount": regret_warning_count,
            "averageScore": _average_score(regret_scores),
            "evidenceLabel": _evidence_label(regret_warning_count, "warning"),
        },
    ]


def _average_score(scores) -> float | None:  # noqa: ANN001
    average = scores.aggregate(average=Avg("score"))["average"]
    return None if average is None else round(float(average), 1)


def _recently_influential_works(aftertaste_entries, media) -> list[dict[str, object]]:  # noqa: ANN001
    entries = list(aftertaste_entries.order_by("-updated_at", "-created_at")[:5])
    works = []
    seen_ids = set()
    for entry in entries:
        seen_ids.add(entry.media_item_id)
        works.append(
            {
                "id": str(entry.media_item.id),
                "title": entry.media_item.title,
                "mediaType": entry.media_item.media_type,
                "personalRating": None
                if entry.media_item.personal_rating is None
                else float(entry.media_item.personal_rating),
                "stayedWithMeScore": entry.stayed_with_me_score,
                "worthTime": entry.worth_time,
                "feltGeneric": entry.felt_generic,
                "appetiteEffect": entry.appetite_effect,
                "updatedAt": entry.updated_at.isoformat().replace("+00:00", "Z"),
            }
        )
    if len(works) >= 5:
        return works

    remaining = (
        media.exclude(id__in=seen_ids)
        .exclude(personal_rating__isnull=True)
        .order_by(
            "-personal_rating",
            "-updated_at",
            "title",
        )[: 5 - len(works)]
    )
    for item in remaining:
        works.append(
            {
                "id": str(item.id),
                "title": item.title,
                "mediaType": item.media_type,
                "personalRating": float(item.personal_rating)
                if item.personal_rating is not None
                else None,
                "stayedWithMeScore": None,
                "worthTime": None,
                "feltGeneric": None,
                "appetiteEffect": None,
                "updatedAt": item.updated_at.isoformat().replace("+00:00", "Z"),
            }
        )
    return works


def _confidence(evidence_counts: dict[str, int]) -> str:
    evidence_total = evidence_counts["scoreCount"] + (evidence_counts["aftertasteCount"] * 2)
    if evidence_total >= 12 and evidence_counts["scoredMediaCount"] >= 3:
        return "high"
    if evidence_total >= 4 and evidence_counts["scoredMediaCount"] >= 1:
        return "medium"
    return "low"


def _generated_summary(
    *,
    is_empty: bool,
    confidence: str,
    strongest_dimensions: list[dict[str, object]],
    weakest_dimensions: list[dict[str, object]],
    strongest_medium: dict[str, object] | None,
    negative_signals: list[dict[str, object]],
) -> str:
    if is_empty:
        return "Add scored media and aftertaste reflections to generate a meaningful Taste Profile."

    clauses = [f"Confidence is {confidence} based on the current logged evidence."]
    if strongest_dimensions:
        clauses.append(
            f"Your strongest current positive signal is {strongest_dimensions[0]['dimensionName']} "
            f"at {strongest_dimensions[0]['averageScore']}/10."
        )
    if weakest_dimensions:
        clauses.append(
            f"Watch {weakest_dimensions[0]['dimensionName']} because it is the clearest "
            "weak or risky signal."
        )
    if strongest_medium:
        medium_label = str(strongest_medium["mediaType"]).replace("_", " ").title()
        clauses.append(f"{medium_label} is your strongest rated medium so far.")
    highest_warning = max(
        negative_signals, key=lambda signal: int(signal["warningCount"]), default=None
    )
    if highest_warning and int(highest_warning["warningCount"]):
        clauses.append(
            f"{highest_warning['label']} has {highest_warning['warningCount']} warning(s)."
        )
    return " ".join(clauses)


def _evidence_label(count: int, noun: str) -> str:
    return f"{count} {noun}{'' if count == 1 else 's'}"
