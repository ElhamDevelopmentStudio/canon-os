from __future__ import annotations

from collections import Counter, defaultdict
from collections.abc import Callable, Iterable
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from statistics import mean

from django.contrib.auth.models import User
from django.db.models import QuerySet
from django.utils import timezone

from canonos.aftertaste.models import AftertasteEntry
from canonos.media.models import MediaItem
from canonos.taste.models import MediaScore, TasteDimension
from canonos.taste.services import seed_default_taste_dimensions

from .models import TasteEvolutionSnapshot

MAX_MONTHS = 12
SIGNIFICANT_RATING_DELTA = 0.5
GENERICNESS_TOLERANCE_WARNING = 60.0
REGRET_WARNING = 35.0
FATIGUE_WARNING = 35.0


@dataclass(frozen=True)
class MonthBucket:
    key: str
    label: str
    start: date


def generate_evolution_snapshot(
    user: User,
    *,
    snapshot_period: str = TasteEvolutionSnapshot.SnapshotPeriod.MONTHLY,
    snapshot_date: date | None = None,
) -> TasteEvolutionSnapshot:
    resolved_date = snapshot_date or timezone.localdate()
    aggregate_data = build_evolution_aggregate(user, snapshot_date=resolved_date)
    insights = build_change_insights(aggregate_data)
    return TasteEvolutionSnapshot.objects.create(
        owner=user,
        snapshot_period=snapshot_period,
        snapshot_date=resolved_date,
        aggregate_data=aggregate_data,
        insights=insights,
    )


def get_latest_evolution_insight(user: User) -> dict[str, object] | None:
    snapshot = (
        TasteEvolutionSnapshot.objects.filter(owner=user)
        .order_by("-snapshot_date", "-created_at")
        .first()
    )
    if not snapshot or not snapshot.insights:
        return None
    return snapshot.insights[0]


def build_evolution_aggregate(
    user: User, *, snapshot_date: date | None = None
) -> dict[str, object]:
    seed_default_taste_dimensions(user)
    resolved_date = snapshot_date or timezone.localdate()
    media = MediaItem.objects.filter(owner=user)
    scores = MediaScore.objects.filter(media_item__owner=user).select_related(
        "media_item",
        "taste_dimension",
    )
    aftertaste_entries = AftertasteEntry.objects.filter(owner=user).select_related("media_item")
    buckets = _month_buckets(_evidence_dates(media, scores, aftertaste_entries), resolved_date)

    evidence_counts = {
        "mediaCount": media.count(),
        "completedMediaCount": media.filter(status=MediaItem.ConsumptionStatus.COMPLETED).count(),
        "ratedMediaCount": media.exclude(personal_rating__isnull=True).count(),
        "scoredMediaCount": scores.values("media_item_id").distinct().count(),
        "scoreCount": scores.count(),
        "aftertasteCount": aftertaste_entries.count(),
        "snapshotMonthCount": len(buckets),
    }
    is_empty = (
        evidence_counts["ratedMediaCount"] == 0
        and evidence_counts["scoreCount"] == 0
        and evidence_counts["aftertasteCount"] == 0
    )

    rating_trend = _rating_trend(buckets, media)
    media_type_trend = _media_type_trend(buckets, media)
    genericness_tolerance_trend = _genericness_tolerance_trend(buckets, scores, aftertaste_entries)
    regret_trend = _regret_trend(buckets, scores, aftertaste_entries)
    completion_fatigue_trend = _completion_fatigue_trend(buckets, media, aftertaste_entries)
    favorite_dimension_trend = _favorite_dimension_trend(buckets, scores)

    return {
        "isEmpty": is_empty,
        "generatedSummary": _generated_summary(
            is_empty=is_empty,
            rating_trend=rating_trend,
            media_type_trend=media_type_trend,
            genericness_tolerance_trend=genericness_tolerance_trend,
            regret_trend=regret_trend,
            favorite_dimension_trend=favorite_dimension_trend,
        ),
        "evidenceCounts": evidence_counts,
        "ratingTrend": rating_trend,
        "mediaTypeTrend": media_type_trend,
        "genericnessToleranceTrend": genericness_tolerance_trend,
        "regretTrend": regret_trend,
        "completionFatigueTrend": completion_fatigue_trend,
        "favoriteDimensionTrend": favorite_dimension_trend,
    }


def build_change_insights(aggregate_data: dict[str, object]) -> list[dict[str, object]]:
    if aggregate_data.get("isEmpty"):
        return [
            {
                "key": "insufficient_evidence",
                "severity": "neutral",
                "title": "Taste Evolution needs evidence",
                "body": (
                    "Add completed, rated, scored, or reflected media before treating taste "
                    "changes as a trend."
                ),
                "recommendation": (
                    "Log at least two completed works with scores and aftertaste reflections, "
                    "then generate another snapshot."
                ),
                "evidence": ["No rated, scored, or aftertaste evidence is available yet."],
            }
        ]

    insights: list[dict[str, object]] = []
    rating = _as_trend(aggregate_data["ratingTrend"])
    genericness = _as_trend(aggregate_data["genericnessToleranceTrend"])
    regret = _as_trend(aggregate_data["regretTrend"])
    fatigue = _as_trend(aggregate_data["completionFatigueTrend"])
    favorite = _as_trend(aggregate_data["favoriteDimensionTrend"])

    rating_delta = _numeric_delta(rating)
    if rating_delta is not None and abs(rating_delta) >= SIGNIFICANT_RATING_DELTA:
        direction_word = "rising" if rating_delta > 0 else "falling"
        severity = "positive" if rating_delta > 0 else "warning"
        insights.append(
            {
                "key": "rating_shift",
                "severity": severity,
                "title": f"Average rating is {direction_word}",
                "body": (
                    f"The latest month moved by {abs(rating_delta):.1f} rating points "
                    "compared with the previous active month."
                ),
                "recommendation": (
                    "Compare recent picks against your strongest taste dimensions before "
                    "adding more of the same source."
                ),
                "evidence": [_trend_evidence(rating)],
            }
        )

    genericness_current = _number_or_none(genericness.get("currentValue"))
    if genericness_current is not None and genericness_current < GENERICNESS_TOLERANCE_WARNING:
        insights.append(
            {
                "key": "genericness_tolerance_low",
                "severity": "warning",
                "title": "Genericness tolerance is tightening",
                "body": (
                    "Recent evidence shows a low tolerance score, meaning genericness "
                    "pressure is showing up in scores or reflections."
                ),
                "recommendation": (
                    "Favor works with originality, atmosphere, or strong personal exception "
                    "evidence before committing time."
                ),
                "evidence": [_trend_evidence(genericness)],
            }
        )

    regret_current = _number_or_none(regret.get("currentValue"))
    if regret_current is not None and regret_current > REGRET_WARNING:
        insights.append(
            {
                "key": "regret_pressure_high",
                "severity": "warning",
                "title": "Regret pressure is rising",
                "body": (
                    "Recent aftertaste or regret scores suggest some picks did not feel "
                    "worth the time."
                ),
                "recommendation": (
                    "Use the Queue and Critic Council before starting similar candidates."
                ),
                "evidence": [_trend_evidence(regret)],
            }
        )

    fatigue_current = _number_or_none(fatigue.get("currentValue"))
    if fatigue_current is not None and fatigue_current > FATIGUE_WARNING:
        insights.append(
            {
                "key": "completion_fatigue_high",
                "severity": "warning",
                "title": "Completion fatigue needs a reset",
                "body": (
                    "Paused, dropped, or not-worth-time evidence is high enough to suggest "
                    "fatigue."
                ),
                "recommendation": (
                    "Pick shorter, lower-commitment queue items until completion quality "
                    "recovers."
                ),
                "evidence": [_trend_evidence(fatigue)],
            }
        )

    favorite_dimension = favorite.get("currentValue")
    if favorite_dimension:
        insights.append(
            {
                "key": "favorite_dimension",
                "severity": "positive",
                "title": f"{favorite_dimension} is carrying recent taste",
                "body": (
                    "Your latest positive dimension leader is the clearest current taste " "anchor."
                ),
                "recommendation": (
                    "Use this dimension as the first filter for future recommendations and "
                    "evaluations."
                ),
                "evidence": [_trend_evidence(favorite)],
            }
        )

    if not insights:
        insights.append(
            {
                "key": "stable_taste",
                "severity": "neutral",
                "title": "Taste is stable in the current evidence",
                "body": (
                    "No major rating, regret, fatigue, or dimension shifts crossed the "
                    "current thresholds."
                ),
                "recommendation": (
                    "Keep logging scores and aftertaste so subtler changes become visible "
                    "over time."
                ),
                "evidence": ["Trend deltas stayed below alert thresholds."],
            }
        )
    return insights[:4]


def _rating_trend(buckets: list[MonthBucket], media: QuerySet[MediaItem]) -> dict[str, object]:
    values_by_month: dict[str, list[float]] = defaultdict(list)
    for item in media.exclude(personal_rating__isnull=True):
        bucket_key = _month_key(_media_date(item))
        values_by_month[bucket_key].append(float(item.personal_rating or 0))

    points = [
        _point(bucket, _round(mean(values_by_month[bucket.key])), len(values_by_month[bucket.key]))
        for bucket in buckets
        if values_by_month[bucket.key]
    ]
    return _trend(
        key="rating",
        label="Rating trend",
        points=points,
        summary_factory=lambda current, previous: _numeric_summary(
            "Average rating",
            current,
            previous,
            suffix="/10",
        ),
    )


def _media_type_trend(buckets: list[MonthBucket], media: QuerySet[MediaItem]) -> dict[str, object]:
    counts_by_month: dict[str, Counter[str]] = defaultdict(Counter)
    for item in media.filter(status=MediaItem.ConsumptionStatus.COMPLETED):
        counts_by_month[_month_key(_media_date(item))][item.media_type] += 1

    points: list[dict[str, object]] = []
    for bucket in buckets:
        counts = counts_by_month[bucket.key]
        if not counts:
            continue
        media_type, count = sorted(counts.items(), key=lambda row: (-row[1], row[0]))[0]
        points.append(
            _point(
                bucket,
                count,
                sum(counts.values()),
                mediaType=media_type,
                mediaTypeLabel=_humanize(media_type),
                distribution={key: counts[key] for key in sorted(counts)},
            )
        )
    return _trend(
        key="media_type",
        label="Medium trend",
        points=points,
        current_value_factory=lambda point: point["meta"].get("mediaTypeLabel") if point else None,
        previous_value_factory=lambda point: point["meta"].get("mediaTypeLabel") if point else None,
        summary_factory=lambda current, previous: _categorical_summary(
            "Dominant medium", current, previous
        ),
    )


def _genericness_tolerance_trend(
    buckets: list[MonthBucket],
    scores: QuerySet[MediaScore],
    aftertaste_entries: QuerySet[AftertasteEntry],
) -> dict[str, object]:
    score_pressure: dict[str, list[float]] = defaultdict(list)
    aftertaste_pressure: dict[str, list[float]] = defaultdict(list)
    for score in scores.filter(taste_dimension__slug="genericness"):
        score_pressure[_month_key(_media_date(score.media_item))].append(float(score.score) * 10)
    for entry in aftertaste_entries:
        aftertaste_pressure[_month_key(_aftertaste_date(entry))].append(
            100.0 if entry.felt_generic else 0.0
        )

    points = []
    for bucket in buckets:
        pressure_parts = []
        if score_pressure[bucket.key]:
            pressure_parts.append(mean(score_pressure[bucket.key]))
        if aftertaste_pressure[bucket.key]:
            pressure_parts.append(mean(aftertaste_pressure[bucket.key]))
        if not pressure_parts:
            continue
        value = max(0.0, min(100.0, 100.0 - mean(pressure_parts)))
        count = len(score_pressure[bucket.key]) + len(aftertaste_pressure[bucket.key])
        points.append(
            _point(
                bucket,
                _round(value),
                count,
                scoreEvidence=len(score_pressure[bucket.key]),
                aftertasteEvidence=len(aftertaste_pressure[bucket.key]),
            )
        )
    return _trend(
        key="genericness_tolerance",
        label="Genericness tolerance",
        points=points,
        summary_factory=lambda current, previous: _numeric_summary(
            "Genericness tolerance",
            current,
            previous,
            suffix="/100",
            higher_is_better=False,
        ),
    )


def _regret_trend(
    buckets: list[MonthBucket],
    scores: QuerySet[MediaScore],
    aftertaste_entries: QuerySet[AftertasteEntry],
) -> dict[str, object]:
    score_pressure: dict[str, list[float]] = defaultdict(list)
    aftertaste_pressure: dict[str, list[float]] = defaultdict(list)
    for score in scores.filter(taste_dimension__slug="regret_score"):
        score_pressure[_month_key(_media_date(score.media_item))].append(float(score.score) * 10)
    for entry in aftertaste_entries:
        aftertaste_pressure[_month_key(_aftertaste_date(entry))].append(
            0.0 if entry.worth_time else 100.0
        )

    points = []
    for bucket in buckets:
        pressure_parts = []
        if score_pressure[bucket.key]:
            pressure_parts.append(mean(score_pressure[bucket.key]))
        if aftertaste_pressure[bucket.key]:
            pressure_parts.append(mean(aftertaste_pressure[bucket.key]))
        if not pressure_parts:
            continue
        count = len(score_pressure[bucket.key]) + len(aftertaste_pressure[bucket.key])
        points.append(
            _point(
                bucket,
                _round(mean(pressure_parts)),
                count,
                scoreEvidence=len(score_pressure[bucket.key]),
                aftertasteEvidence=len(aftertaste_pressure[bucket.key]),
            )
        )
    return _trend(
        key="regret",
        label="Regret trend",
        points=points,
        summary_factory=lambda current, previous: _numeric_summary(
            "Regret pressure",
            current,
            previous,
            suffix="/100",
            higher_is_better=False,
        ),
    )


def _completion_fatigue_trend(
    buckets: list[MonthBucket],
    media: QuerySet[MediaItem],
    aftertaste_entries: QuerySet[AftertasteEntry],
) -> dict[str, object]:
    all_media_by_month: dict[str, int] = defaultdict(int)
    fatigue_media_by_month: dict[str, int] = defaultdict(int)
    aftertaste_pressure: dict[str, list[float]] = defaultdict(list)
    for item in media:
        key = _month_key(_media_date(item))
        all_media_by_month[key] += 1
        if item.status in {
            MediaItem.ConsumptionStatus.PAUSED,
            MediaItem.ConsumptionStatus.DROPPED,
        }:
            fatigue_media_by_month[key] += 1
    for entry in aftertaste_entries:
        aftertaste_pressure[_month_key(_aftertaste_date(entry))].append(
            0.0 if entry.worth_time else 100.0
        )

    points = []
    for bucket in buckets:
        pressure_parts = []
        if all_media_by_month[bucket.key]:
            pressure_parts.append(
                fatigue_media_by_month[bucket.key] / all_media_by_month[bucket.key] * 100
            )
        if aftertaste_pressure[bucket.key]:
            pressure_parts.append(mean(aftertaste_pressure[bucket.key]))
        if not pressure_parts:
            continue
        points.append(
            _point(
                bucket,
                _round(mean(pressure_parts)),
                all_media_by_month[bucket.key] + len(aftertaste_pressure[bucket.key]),
                pausedOrDropped=fatigue_media_by_month[bucket.key],
                mediaEvidence=all_media_by_month[bucket.key],
                aftertasteEvidence=len(aftertaste_pressure[bucket.key]),
            )
        )
    return _trend(
        key="completion_fatigue",
        label="Completion fatigue",
        points=points,
        summary_factory=lambda current, previous: _numeric_summary(
            "Completion fatigue",
            current,
            previous,
            suffix="/100",
            higher_is_better=False,
        ),
    )


def _favorite_dimension_trend(
    buckets: list[MonthBucket],
    scores: QuerySet[MediaScore],
) -> dict[str, object]:
    dimension_scores: dict[str, dict[str, list[MediaScore]]] = defaultdict(
        lambda: defaultdict(list)
    )
    for score in scores.filter(taste_dimension__direction=TasteDimension.Direction.POSITIVE):
        dimension_scores[_month_key(_media_date(score.media_item))][
            score.taste_dimension.slug
        ].append(score)

    points = []
    for bucket in buckets:
        if not dimension_scores[bucket.key]:
            continue
        best_slug, best_scores = sorted(
            dimension_scores[bucket.key].items(),
            key=lambda row: (-mean(float(score.score) for score in row[1]), -len(row[1]), row[0]),
        )[0]
        dimension = best_scores[0].taste_dimension
        points.append(
            _point(
                bucket,
                _round(mean(float(score.score) for score in best_scores)),
                len(best_scores),
                dimensionSlug=best_slug,
                dimensionName=dimension.name,
            )
        )
    return _trend(
        key="favorite_dimension",
        label="Favorite dimension",
        points=points,
        current_value_factory=lambda point: point["meta"].get("dimensionName") if point else None,
        previous_value_factory=lambda point: point["meta"].get("dimensionName") if point else None,
        summary_factory=lambda current, previous: _categorical_summary(
            "Favorite positive dimension",
            current,
            previous,
        ),
    )


def _trend(
    *,
    key: str,
    label: str,
    points: list[dict[str, object]],
    summary_factory: Callable[[object, object], str],
    current_value_factory: Callable[[dict[str, object] | None], object] | None = None,
    previous_value_factory: Callable[[dict[str, object] | None], object] | None = None,
) -> dict[str, object]:
    current_point = points[-1] if points else None
    previous_point = points[-2] if len(points) >= 2 else None
    current_value = (
        current_value_factory(current_point)
        if current_value_factory
        else (current_point["value"] if current_point else None)
    )
    previous_value = (
        previous_value_factory(previous_point)
        if previous_value_factory
        else (previous_point["value"] if previous_point else None)
    )
    return {
        "key": key,
        "label": label,
        "direction": _direction(current_value, previous_value),
        "summary": summary_factory(current_value, previous_value),
        "currentValue": current_value,
        "previousValue": previous_value,
        "points": points,
    }


def _direction(current_value: object, previous_value: object) -> str:
    if current_value is None:
        return "insufficient_data"
    if previous_value is None:
        return "new"
    current_number = _number_or_none(current_value)
    previous_number = _number_or_none(previous_value)
    if current_number is not None and previous_number is not None:
        delta = current_number - previous_number
        if abs(delta) < 0.1:
            return "flat"
        return "up" if delta > 0 else "down"
    return "flat" if current_value == previous_value else "new"


def _point(
    bucket: MonthBucket, value: float | int | None, count: int, **meta: object
) -> dict[str, object]:
    return {
        "period": bucket.key,
        "label": bucket.label,
        "value": value,
        "count": count,
        "meta": meta,
    }


def _month_buckets(evidence_dates: Iterable[date], snapshot_date: date) -> list[MonthBucket]:
    starts = {_month_start(evidence_date) for evidence_date in evidence_dates}
    starts.add(_month_start(snapshot_date))
    if not starts:
        return []
    sorted_starts = sorted(starts)[-MAX_MONTHS:]
    return [
        MonthBucket(key=_month_key(start), label=start.strftime("%b %Y"), start=start)
        for start in sorted_starts
    ]


def _evidence_dates(
    media: QuerySet[MediaItem],
    scores: QuerySet[MediaScore],
    aftertaste_entries: QuerySet[AftertasteEntry],
) -> list[date]:
    dates = [_media_date(item) for item in media]
    dates.extend(_media_date(score.media_item) for score in scores)
    dates.extend(_aftertaste_date(entry) for entry in aftertaste_entries)
    return dates


def _media_date(item: MediaItem) -> date:
    if item.completed_date:
        return item.completed_date
    return item.updated_at.date() if item.updated_at else timezone.localdate()


def _aftertaste_date(entry: AftertasteEntry) -> date:
    if entry.media_item.completed_date:
        return entry.media_item.completed_date
    return entry.updated_at.date() if entry.updated_at else timezone.localdate()


def _month_start(value: date) -> date:
    return date(value.year, value.month, 1)


def _month_key(value: date) -> str:
    return _month_start(value).isoformat()[:7]


def _round(value: float | Decimal) -> float:
    return round(float(value), 1)


def _number_or_none(value: object) -> float | None:
    if isinstance(value, int | float | Decimal):
        return float(value)
    return None


def _numeric_delta(trend: dict[str, object]) -> float | None:
    current = _number_or_none(trend.get("currentValue"))
    previous = _number_or_none(trend.get("previousValue"))
    if current is None or previous is None:
        return None
    return current - previous


def _numeric_summary(
    label: str,
    current: object,
    previous: object,
    *,
    suffix: str,
    higher_is_better: bool = True,
) -> str:
    current_number = _number_or_none(current)
    previous_number = _number_or_none(previous)
    if current_number is None:
        return f"{label} needs more evidence."
    if previous_number is None:
        return f"{label} is {current_number:.1f}{suffix} in the latest evidence."
    delta = current_number - previous_number
    if abs(delta) < 0.1:
        return f"{label} is stable at {current_number:.1f}{suffix}."
    verb = "up" if delta > 0 else "down"
    if not higher_is_better:
        direction = "worse" if delta > 0 else "better"
        return (
            f"{label} is {verb} to {current_number:.1f}{suffix}, which is {direction} "
            "than the previous active month."
        )
    return (
        f"{label} is {verb} to {current_number:.1f}{suffix} from " f"{previous_number:.1f}{suffix}."
    )


def _categorical_summary(label: str, current: object, previous: object) -> str:
    if not current:
        return f"{label} needs more evidence."
    if not previous:
        return f"{label} is now {current}."
    if current == previous:
        return f"{label} remains {current}."
    return f"{label} shifted from {previous} to {current}."


def _generated_summary(
    *,
    is_empty: bool,
    rating_trend: dict[str, object],
    media_type_trend: dict[str, object],
    genericness_tolerance_trend: dict[str, object],
    regret_trend: dict[str, object],
    favorite_dimension_trend: dict[str, object],
) -> str:
    if is_empty:
        return (
            "Generate snapshots after logging ratings, scores, or aftertaste so CanonOS "
            "can show taste drift."
        )
    clauses = [str(rating_trend["summary"]), str(media_type_trend["summary"])]
    genericness_value = _number_or_none(genericness_tolerance_trend.get("currentValue"))
    regret_value = _number_or_none(regret_trend.get("currentValue"))
    favorite_value = favorite_dimension_trend.get("currentValue")
    if genericness_value is not None:
        clauses.append(f"Genericness tolerance is {genericness_value:.1f}/100.")
    if regret_value is not None:
        clauses.append(f"Regret pressure is {regret_value:.1f}/100.")
    if favorite_value:
        clauses.append(f"{favorite_value} is the latest favorite dimension.")
    return " ".join(clauses)


def _trend_evidence(trend: dict[str, object]) -> str:
    current = trend.get("currentValue")
    previous = trend.get("previousValue")
    label = trend.get("label")
    if previous is None:
        return f"{label}: latest value {current}."
    return f"{label}: latest value {current}, previous active value {previous}."


def _as_trend(value: object) -> dict[str, object]:
    if not isinstance(value, dict):
        raise TypeError("Expected trend dictionary")
    return value


def _humanize(value: str) -> str:
    return value.replace("_", " ").title()


def parse_snapshot_date(value: str | None) -> date | None:
    if not value:
        return None
    return datetime.strptime(value, "%Y-%m-%d").date()
