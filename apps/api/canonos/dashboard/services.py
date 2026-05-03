from __future__ import annotations

from django.contrib.auth.models import User
from django.db.models import Avg, Count, F, QuerySet
from django.utils import timezone

from canonos.evolution.services import get_latest_evolution_insight
from canonos.media.models import MediaItem
from canonos.taste.models import MediaScore


def _serialize_media_item(item: MediaItem) -> dict[str, object]:
    return {
        "id": str(item.id),
        "title": item.title,
        "mediaType": item.media_type,
        "status": item.status,
        "personalRating": None if item.personal_rating is None else float(item.personal_rating),
        "updatedAt": item.updated_at.isoformat().replace("+00:00", "Z"),
    }


def _base_queryset(user: User) -> QuerySet[MediaItem]:
    return MediaItem.objects.filter(owner=user)


def build_dashboard_summary(user: User) -> dict[str, object]:
    media = _base_queryset(user)
    counts = {
        "totalMedia": media.count(),
        "completedMedia": media.filter(status=MediaItem.ConsumptionStatus.COMPLETED).count(),
        "plannedMedia": media.filter(status=MediaItem.ConsumptionStatus.PLANNED).count(),
        "droppedMedia": media.filter(status=MediaItem.ConsumptionStatus.DROPPED).count(),
    }
    media_type_breakdown = [
        {"mediaType": row["media_type"], "count": row["count"]}
        for row in media.values("media_type").annotate(count=Count("id")).order_by("media_type")
    ]
    recent_activity = [
        _serialize_media_item(item) for item in media.order_by("-updated_at", "title")[:5]
    ]
    highest_rated = [
        _serialize_media_item(item)
        for item in media.exclude(personal_rating__isnull=True).order_by(
            "-personal_rating",
            "-updated_at",
            "title",
        )[:5]
    ]
    top_taste_signals = [
        {
            "dimensionId": str(row["dimensionId"]),
            "dimensionSlug": row["dimensionSlug"],
            "dimensionName": row["dimensionName"],
            "dimensionDirection": row["dimensionDirection"],
            "averageScore": float(row["averageScore"]),
            "scoreCount": row["scoreCount"],
        }
        for row in MediaScore.objects.filter(media_item__owner=user)
        .values(
            dimensionId=F("taste_dimension_id"),
            dimensionSlug=F("taste_dimension__slug"),
            dimensionName=F("taste_dimension__name"),
            dimensionDirection=F("taste_dimension__direction"),
        )
        .annotate(averageScore=Avg("score"), scoreCount=Count("id"))
        .order_by("-averageScore", "dimensionName")[:5]
    ]

    return {
        "counts": counts,
        "mediaTypeBreakdown": media_type_breakdown,
        "recentActivity": recent_activity,
        "highestRated": highest_rated,
        "topTasteSignals": top_taste_signals,
        "latestTasteEvolutionInsight": get_latest_evolution_insight(user),
        "generatedAt": timezone.now().isoformat().replace("+00:00", "Z"),
    }
