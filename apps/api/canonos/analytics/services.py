from __future__ import annotations

from collections import defaultdict
from datetime import date
from decimal import Decimal
from typing import Any

from django.contrib.auth.models import User
from django.utils import timezone

from canonos.media.models import MediaItem
from canonos.narrative.models import NarrativeAnalysis
from canonos.taste.models import MediaScore

RATING_BUCKETS = [
    (0.0, 2.0, "0-2", "0–2"),
    (2.0, 4.0, "2-4", "2–4"),
    (4.0, 6.0, "4-6", "4–6"),
    (6.0, 8.0, "6-8", "6–8"),
    (8.0, 10.0, "8-10", "8–10"),
]
NEGATIVE_SIGNAL_SLUGS = {"genericness", "regret_score"}


def _generated_at():  # noqa: ANN202
    return timezone.now()


def _float(value: Decimal | float | int | None, places: int = 2) -> float | None:
    if value is None:
        return None
    return round(float(value), places)


def _average(values: list[Decimal | float | int]) -> float | None:
    if not values:
        return None
    return round(sum(float(value) for value in values) / len(values), 2)


def _period_key(value: date) -> tuple[str, str]:
    return value.strftime("%Y-%m"), value.strftime("%b %Y")


def _dated_media_item(item: MediaItem) -> date:
    return item.completed_date or item.started_date or item.updated_at.date()


def _dated_score(score: MediaScore) -> date:
    return (
        score.media_item.completed_date or score.media_item.started_date or score.updated_at.date()
    )


def _estimate_time_cost_minutes(item: MediaItem) -> int | None:
    if item.runtime_minutes:
        return item.runtime_minutes
    if item.episode_count:
        return item.episode_count * 45
    if item.page_count:
        return item.page_count * 2
    if item.audiobook_length_minutes:
        return item.audiobook_length_minutes
    return None


def _media_label(item: MediaItem) -> dict[str, object]:
    return {
        "mediaItemId": str(item.id),
        "title": item.title,
        "mediaType": item.media_type,
    }


def build_consumption_timeline(user: User) -> dict[str, object]:
    rows: dict[str, dict[str, Any]] = {}
    items = MediaItem.objects.filter(
        owner=user,
        status__in=[MediaItem.ConsumptionStatus.COMPLETED, MediaItem.ConsumptionStatus.DROPPED],
    ).order_by("completed_date", "updated_at", "title")

    for item in items:
        period, label = _period_key(_dated_media_item(item))
        row = rows.setdefault(
            period,
            {
                "period": period,
                "label": label,
                "completedCount": 0,
                "droppedCount": 0,
                "totalCount": 0,
                "_ratings": [],
            },
        )
        if item.status == MediaItem.ConsumptionStatus.COMPLETED:
            row["completedCount"] += 1
        if item.status == MediaItem.ConsumptionStatus.DROPPED:
            row["droppedCount"] += 1
        row["totalCount"] += 1
        if item.personal_rating is not None:
            row["_ratings"].append(item.personal_rating)

    points = []
    for period in sorted(rows):
        row = rows[period]
        points.append(
            {
                "period": row["period"],
                "label": row["label"],
                "completedCount": row["completedCount"],
                "droppedCount": row["droppedCount"],
                "totalCount": row["totalCount"],
                "averageRating": _average(row["_ratings"]),
            }
        )

    return {"isEmpty": len(points) == 0, "generatedAt": _generated_at(), "points": points}


def build_rating_distribution(user: User) -> dict[str, object]:
    ratings = [
        float(rating)
        for rating in MediaItem.objects.filter(owner=user)
        .exclude(personal_rating__isnull=True)
        .values_list("personal_rating", flat=True)
    ]
    buckets = [
        {
            "bucket": bucket,
            "label": label,
            "minRating": minimum,
            "maxRating": maximum,
            "count": 0,
        }
        for minimum, maximum, bucket, label in RATING_BUCKETS
    ]

    for rating in ratings:
        for index, (minimum, maximum, _, _) in enumerate(RATING_BUCKETS):
            is_last_bucket = index == len(RATING_BUCKETS) - 1
            if (minimum <= rating < maximum) or (is_last_bucket and minimum <= rating <= maximum):
                buckets[index]["count"] += 1
                break

    return {
        "isEmpty": len(ratings) == 0,
        "generatedAt": _generated_at(),
        "ratedCount": len(ratings),
        "averageRating": _average(ratings),
        "buckets": buckets,
    }


def build_media_type_distribution(user: User) -> dict[str, object]:
    items = list(MediaItem.objects.filter(owner=user).order_by("media_type", "title"))
    groups: dict[str, dict[str, Any]] = {}
    for item in items:
        row = groups.setdefault(
            item.media_type,
            {"mediaType": item.media_type, "count": 0, "completedCount": 0, "_ratings": []},
        )
        row["count"] += 1
        if item.status == MediaItem.ConsumptionStatus.COMPLETED:
            row["completedCount"] += 1
        if item.personal_rating is not None:
            row["_ratings"].append(item.personal_rating)

    total_count = len(items)
    results = []
    for media_type in sorted(groups):
        row = groups[media_type]
        results.append(
            {
                "mediaType": row["mediaType"],
                "count": row["count"],
                "completedCount": row["completedCount"],
                "averageRating": _average(row["_ratings"]),
                "sharePercent": round((row["count"] / total_count) * 100, 1) if total_count else 0,
            }
        )

    return {
        "isEmpty": total_count == 0,
        "generatedAt": _generated_at(),
        "totalCount": total_count,
        "results": results,
    }


def build_dimension_trends(user: User) -> dict[str, object]:
    scores = list(
        MediaScore.objects.filter(media_item__owner=user)
        .select_related("taste_dimension", "media_item")
        .order_by("taste_dimension__name", "media_item__completed_date", "updated_at")
    )
    groups: dict[str, dict[str, Any]] = {}
    for score in scores:
        dimension = score.taste_dimension
        group = groups.setdefault(
            str(dimension.id),
            {
                "dimensionId": str(dimension.id),
                "dimensionSlug": dimension.slug,
                "dimensionName": dimension.name,
                "dimensionDirection": dimension.direction,
                "_scores": [],
                "_periods": defaultdict(list),
            },
        )
        group["_scores"].append(score.score)
        period, label = _period_key(_dated_score(score))
        group["_periods"][(period, label)].append(score.score)

    dimensions = []
    for group in sorted(
        groups.values(), key=lambda row: (-len(row["_scores"]), row["dimensionName"])
    ):
        points = [
            {
                "period": period,
                "label": label,
                "averageScore": _average(period_scores),
                "scoreCount": len(period_scores),
            }
            for (period, label), period_scores in sorted(group["_periods"].items())
        ]
        dimensions.append(
            {
                "dimensionId": group["dimensionId"],
                "dimensionSlug": group["dimensionSlug"],
                "dimensionName": group["dimensionName"],
                "dimensionDirection": group["dimensionDirection"],
                "averageScore": _average(group["_scores"]),
                "scoreCount": len(group["_scores"]),
                "points": points,
            }
        )

    return {
        "isEmpty": len(dimensions) == 0,
        "generatedAt": _generated_at(),
        "dimensions": dimensions,
    }


def build_genericness_satisfaction(user: User) -> dict[str, object]:
    scores = MediaScore.objects.filter(
        media_item__owner=user,
        taste_dimension__slug="genericness",
        media_item__personal_rating__isnull=False,
    ).select_related("media_item")
    points = [
        {
            **_media_label(score.media_item),
            "genericnessScore": _float(score.score),
            "satisfactionScore": _float(score.media_item.personal_rating),
        }
        for score in scores.order_by("media_item__title")
    ]
    average_genericness = _average([Decimal(str(point["genericnessScore"])) for point in points])
    average_satisfaction = _average([Decimal(str(point["satisfactionScore"])) for point in points])
    insight = "Score media for genericness and satisfaction to reveal the tradeoff."
    if points and average_genericness is not None and average_satisfaction is not None:
        if average_genericness >= 6 and average_satisfaction <= 6:
            insight = "High genericness is currently tracking with lower satisfaction."
        elif average_genericness <= 4 and average_satisfaction >= 7:
            insight = "Lower genericness is tracking with stronger satisfaction."
        else:
            insight = (
                "Genericness and satisfaction are mixed; "
                "use individual outliers as decision evidence."
            )

    return {
        "isEmpty": len(points) == 0,
        "generatedAt": _generated_at(),
        "points": points,
        "averageGenericness": average_genericness,
        "averageSatisfaction": average_satisfaction,
        "insight": insight,
    }


def build_regret_time_cost(user: User) -> dict[str, object]:
    scores = MediaScore.objects.filter(
        media_item__owner=user,
        taste_dimension__slug="regret_score",
    ).select_related("media_item")
    points = []
    regrets: list[Decimal] = []
    total_high_regret_minutes = 0
    for score in scores.order_by("media_item__title"):
        item = score.media_item
        time_cost_minutes = _estimate_time_cost_minutes(item)
        regret_score = _float(score.score)
        regrets.append(score.score)
        if regret_score is not None and regret_score >= 7 and time_cost_minutes is not None:
            total_high_regret_minutes += time_cost_minutes
        points.append(
            {
                **_media_label(item),
                "regretScore": regret_score,
                "timeCostMinutes": time_cost_minutes,
            }
        )

    average_regret = _average(regrets)
    insight = "Score regret and time cost to reveal avoidable time sinks."
    if points and total_high_regret_minutes > 0:
        insight = f"High-regret items account for {total_high_regret_minutes} estimated minutes."
    elif points:
        insight = "No high-regret time-cost cluster is visible yet."

    return {
        "isEmpty": len(points) == 0,
        "generatedAt": _generated_at(),
        "points": points,
        "averageRegret": average_regret,
        "totalHighRegretMinutes": total_high_regret_minutes,
        "insight": insight,
    }


def build_top_creators(user: User) -> dict[str, object]:
    items = list(
        MediaItem.objects.filter(owner=user).exclude(creator="").order_by("creator", "title")
    )
    negative_media_ids = set(
        MediaScore.objects.filter(
            media_item__owner=user,
            taste_dimension__slug__in=NEGATIVE_SIGNAL_SLUGS,
            score__gte=7,
        ).values_list("media_item_id", flat=True)
    )
    groups: dict[str, dict[str, Any]] = {}
    for item in items:
        creator = item.creator.strip()
        if not creator:
            continue
        row = groups.setdefault(
            creator,
            {
                "creator": creator,
                "count": 0,
                "completedCount": 0,
                "negativeSignalCount": 0,
                "_ratings": [],
                "_items": [],
            },
        )
        row["count"] += 1
        row["_items"].append(item)
        if item.status == MediaItem.ConsumptionStatus.COMPLETED:
            row["completedCount"] += 1
        if item.personal_rating is not None:
            row["_ratings"].append(item.personal_rating)
        if item.status == MediaItem.ConsumptionStatus.DROPPED or item.id in negative_media_ids:
            row["negativeSignalCount"] += 1

    results = []
    for row in groups.values():
        rated_items = [item for item in row["_items"] if item.personal_rating is not None]
        best_item = max(
            rated_items, key=lambda item: (item.personal_rating, item.title), default=None
        )
        results.append(
            {
                "creator": row["creator"],
                "count": row["count"],
                "completedCount": row["completedCount"],
                "averageRating": _average(row["_ratings"]),
                "bestTitle": best_item.title if best_item else None,
                "negativeSignalCount": row["negativeSignalCount"],
            }
        )

    results.sort(key=lambda row: (-row["count"], -(row["averageRating"] or 0), row["creator"]))
    return {"isEmpty": len(results) == 0, "generatedAt": _generated_at(), "results": results[:10]}


def build_top_themes(user: User) -> dict[str, object]:
    analyses = NarrativeAnalysis.objects.filter(
        owner=user, status=NarrativeAnalysis.Status.COMPLETED
    ).select_related("media_item")
    groups: dict[str, dict[str, Any]] = {}
    for analysis in analyses:
        for raw_trait in analysis.extracted_traits or []:
            if not isinstance(raw_trait, dict):
                continue
            key = str(
                raw_trait.get("key") or raw_trait.get("trait") or raw_trait.get("label") or ""
            ).strip()
            label = str(raw_trait.get("label") or key.replace("_", " ").title()).strip()
            if not key and not label:
                continue
            score = raw_trait.get("score", raw_trait.get("value", None))
            try:
                numeric_score = float(score) if score is not None else None
            except (TypeError, ValueError):
                numeric_score = None
            theme_key = key or label.lower().replace(" ", "_")
            row = groups.setdefault(
                theme_key,
                {"key": theme_key, "label": label, "count": 0, "_scores": [], "_examples": []},
            )
            row["count"] += 1
            if numeric_score is not None:
                row["_scores"].append(numeric_score)
            row["_examples"].append(analysis.media_item.title)

    results = []
    for row in groups.values():
        results.append(
            {
                "key": row["key"],
                "label": row["label"],
                "count": row["count"],
                "averageScore": _average(row["_scores"]),
                "exampleTitle": row["_examples"][0] if row["_examples"] else None,
            }
        )
    results.sort(key=lambda row: (-row["count"], -(row["averageScore"] or 0), row["label"]))
    return {"isEmpty": len(results) == 0, "generatedAt": _generated_at(), "results": results[:10]}


def build_analytics_overview(user: User) -> dict[str, object]:
    return {
        "consumptionTimeline": build_consumption_timeline(user),
        "ratingDistribution": build_rating_distribution(user),
        "mediaTypeDistribution": build_media_type_distribution(user),
        "dimensionTrends": build_dimension_trends(user),
        "genericnessSatisfaction": build_genericness_satisfaction(user),
        "regretTimeCost": build_regret_time_cost(user),
        "topCreators": build_top_creators(user),
        "topThemes": build_top_themes(user),
    }
