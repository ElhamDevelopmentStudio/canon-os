from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from django.contrib.auth.models import AbstractUser
from django.db import models, transaction
from django.utils import timezone

from canonos.media.models import MediaItem

from .models import QueueItem

RecommendationSlot = Literal["safe", "challenging", "wildcard"]
RecommendationSource = Literal["queue", "planned_media"]


@dataclass(frozen=True)
class TonightContext:
    available_minutes: int
    energy_level: str
    focus_level: str
    desired_effect: str
    preferred_media_types: list[str]
    risk_tolerance: str


@dataclass(frozen=True)
class TonightCandidate:
    source: RecommendationSource
    title: str
    media_type: str
    estimated_time_minutes: int | None
    queue_item_id: str | None
    media_item_id: str | None
    candidate_id: str | None
    priority: str | None
    reason_text: str
    best_mood: str
    queue_position: int
    mood_compatibility: int
    intensity_level: int
    complexity_level: int
    commitment_level: int
    freshness_score: float
    times_recommended: int
    personal_rating: float | None = None


@dataclass(frozen=True)
class QueueMetricDefaults:
    mood_compatibility: int
    intensity_level: int
    complexity_level: int
    commitment_level: int


@dataclass(frozen=True)
class QueueScore:
    item_id: str
    score: float
    freshness_score: float
    priority: str
    is_archived: bool
    reason: str


@dataclass(frozen=True)
class QueueRecalculationResult:
    items: list[QueueItem]
    scores: list[QueueScore]
    active_count: int
    archived_count: int
    average_score: float
    top_insight: str
    fatigue_warnings: list[str]


def infer_queue_metric_defaults(
    *,
    title: str,
    media_type: str,
    priority: str,
    estimated_time_minutes: int | None,
    best_mood: str,
    reason: str,
) -> QueueMetricDefaults:
    """Infer editable queue v2 metrics from the existing MVP queue snapshot fields."""
    text = f"{title} {best_mood} {reason}".casefold()
    duration = estimated_time_minutes or _default_duration_for_media_type(media_type)

    mood = 50
    if priority == QueueItem.Priority.START_SOON:
        mood += 18
    elif priority == QueueItem.Priority.SAMPLE_FIRST:
        mood += 8
    else:
        mood -= 10
    if any(keyword in text for keyword in {"focused", "fits", "quality", "strong", "comfort"}):
        mood += 12
    if any(keyword in text for keyword in {"wrong mood", "not tonight", "delay", "fatigue"}):
        mood -= 18
    if duration <= 90:
        mood += 8
    elif duration >= 240:
        mood -= 12

    intensity = 5
    if any(keyword in text for keyword in {"intense", "heavy", "dark", "challenging", "violent"}):
        intensity += 3
    if any(keyword in text for keyword in {"light", "cozy", "comfort", "easy", "calm"}):
        intensity -= 2
    if media_type == MediaItem.MediaType.AUDIOBOOK:
        intensity -= 1

    complexity = 5
    if any(keyword in text for keyword in {"deep", "dense", "literary", "complex", "canon"}):
        complexity += 3
    if any(keyword in text for keyword in {"light", "simple", "easy", "fun"}):
        complexity -= 2

    commitment = _commitment_from_duration(duration)
    if media_type == MediaItem.MediaType.TV_SHOW:
        commitment = max(commitment, 8)
    if media_type == MediaItem.MediaType.NOVEL and duration >= 300:
        commitment = max(commitment, 7)

    return QueueMetricDefaults(
        mood_compatibility=int(_clamp(mood, 0, 100)),
        intensity_level=int(_clamp(intensity, 0, 10)),
        complexity_level=int(_clamp(complexity, 0, 10)),
        commitment_level=int(_clamp(commitment, 0, 10)),
    )


def recalculate_queue_for_user(user: AbstractUser) -> QueueRecalculationResult:
    now = timezone.now()
    items = list(
        QueueItem.objects.filter(owner=user)
        .select_related("media_item", "candidate")
        .order_by("is_archived", "queue_position", "-updated_at", "title")
    )
    score_by_id = {str(item.id): score_queue_item(item, now=now) for item in items}
    active_items = sorted(
        [item for item in items if not score_by_id[str(item.id)].is_archived],
        key=lambda item: (-score_by_id[str(item.id)].score, item.title.casefold(), str(item.id)),
    )
    archived_items = sorted(
        [item for item in items if score_by_id[str(item.id)].is_archived],
        key=lambda item: (-score_by_id[str(item.id)].score, item.title.casefold(), str(item.id)),
    )

    with transaction.atomic():
        for position, item in enumerate(active_items, start=1):
            score = score_by_id[str(item.id)]
            item.queue_position = position
            item.priority = score.priority
            item.freshness_score = score.freshness_score
            item.is_archived = False
            item.save(
                update_fields=[
                    "queue_position",
                    "priority",
                    "freshness_score",
                    "is_archived",
                    "updated_at",
                ]
            )
        for position, item in enumerate(archived_items, start=len(active_items) + 1):
            score = score_by_id[str(item.id)]
            item.queue_position = position
            item.priority = QueueItem.Priority.LATER
            item.freshness_score = score.freshness_score
            item.is_archived = True
            item.save(
                update_fields=[
                    "queue_position",
                    "priority",
                    "freshness_score",
                    "is_archived",
                    "updated_at",
                ]
            )

    refreshed_items = list(
        QueueItem.objects.filter(owner=user)
        .select_related("media_item", "candidate")
        .order_by("is_archived", "queue_position", "-updated_at", "title")
    )
    scores = [score_by_id[str(item.id)] for item in refreshed_items]
    active_count = sum(1 for item in refreshed_items if not item.is_archived)
    archived_count = len(refreshed_items) - active_count
    average_score = (
        round(
            sum(score.score for score in scores) / len(scores),
            2,
        )
        if scores
        else 0.0
    )
    return QueueRecalculationResult(
        items=refreshed_items,
        scores=scores,
        active_count=active_count,
        archived_count=archived_count,
        average_score=average_score,
        top_insight=_top_queue_insight(refreshed_items, score_by_id),
        fatigue_warnings=_fatigue_warnings(refreshed_items),
    )


def score_queue_item(item: QueueItem, *, now=None) -> QueueScore:  # noqa: ANN001
    now = now or timezone.now()
    freshness = _decayed_freshness(item, now=now)
    priority_score = {
        QueueItem.Priority.START_SOON: 18.0,
        QueueItem.Priority.SAMPLE_FIRST: 8.0,
        QueueItem.Priority.LATER: -4.0,
    }.get(item.priority, 0.0)
    commitment_penalty = item.commitment_level * 2.3
    complexity_penalty = max(item.complexity_level - 7, 0) * 2.5
    intensity_balance = 5.0 if 3 <= item.intensity_level <= 7 else -3.0
    short_fit_bonus = 6.0 if (item.estimated_time_minutes or 999) <= 90 else 0.0
    score = (
        20.0
        + (item.mood_compatibility * 0.34)
        + (freshness * 0.28)
        + priority_score
        + intensity_balance
        + short_fit_bonus
        - commitment_penalty
        - complexity_penalty
    )
    score = round(_clamp(score, 0, 100), 2)
    archive = _should_archive(item, score, freshness)
    next_priority = _priority_from_score(score, archive)
    return QueueScore(
        item_id=str(item.id),
        score=score,
        freshness_score=round(freshness, 2),
        priority=next_priority,
        is_archived=archive,
        reason=_score_reason(item, score, freshness, archive),
    )


def generate_tonight_recommendations(
    user: AbstractUser, context: TonightContext
) -> list[dict[str, object]]:
    candidates = _collect_queue_candidates(user) + _collect_planned_media_candidates(user)
    filtered = [
        _score_candidate(candidate, context)
        for candidate in candidates
        if _fits_time(candidate, context)
    ]
    filtered.sort(
        key=lambda item: (
            -float(item["score"]),
            _slot_order(str(item["slot"])),
            str(item["title"]).casefold(),
        )
    )

    recommendations: list[dict[str, object]] = []
    used_keys: set[tuple[str | None, str | None, str]] = set()
    for slot in ("safe", "challenging", "wildcard"):
        choice = _first_available_for_slot(filtered, slot, used_keys)
        if choice:
            recommendations.append(choice)
            used_keys.add(_dedupe_key(choice))

    for choice in filtered:
        if len(recommendations) >= 5:
            break
        key = _dedupe_key(choice)
        if key not in used_keys:
            recommendations.append(choice)
            used_keys.add(key)

    recommendations = recommendations[:5]
    _mark_queue_items_recommended(recommendations)
    return recommendations


def _collect_queue_candidates(user: AbstractUser) -> list[TonightCandidate]:
    items = (
        QueueItem.objects.filter(owner=user, is_archived=False)
        .select_related("media_item", "candidate")
        .order_by("queue_position", "-updated_at", "title")
    )
    return [
        TonightCandidate(
            source="queue",
            title=item.title,
            media_type=item.media_type,
            estimated_time_minutes=item.estimated_time_minutes
            or _estimate_media_time(item.media_item),
            queue_item_id=str(item.id),
            media_item_id=str(item.media_item_id) if item.media_item_id else None,
            candidate_id=str(item.candidate_id) if item.candidate_id else None,
            priority=item.priority,
            reason_text=item.reason,
            best_mood=item.best_mood,
            queue_position=item.queue_position,
            mood_compatibility=item.mood_compatibility,
            intensity_level=item.intensity_level,
            complexity_level=item.complexity_level,
            commitment_level=item.commitment_level,
            freshness_score=item.freshness_score,
            times_recommended=item.times_recommended,
            personal_rating=float(item.media_item.personal_rating)
            if item.media_item and item.media_item.personal_rating
            else None,
        )
        for item in items
    ]


def _collect_planned_media_candidates(user: AbstractUser) -> list[TonightCandidate]:
    queued_media_ids = QueueItem.objects.filter(
        owner=user,
        media_item_id__isnull=False,
    ).values_list("media_item_id", flat=True)
    media_items = (
        MediaItem.objects.filter(owner=user, status=MediaItem.ConsumptionStatus.PLANNED)
        .exclude(id__in=queued_media_ids)
        .order_by("-updated_at", "title")[:50]
    )
    return [
        TonightCandidate(
            source="planned_media",
            title=item.title,
            media_type=item.media_type,
            estimated_time_minutes=_estimate_media_time(item),
            queue_item_id=None,
            media_item_id=str(item.id),
            candidate_id=None,
            priority=None,
            reason_text=item.notes,
            best_mood="",
            queue_position=1000 + index,
            mood_compatibility=55,
            intensity_level=5,
            complexity_level=5,
            commitment_level=_commitment_from_duration(_estimate_media_time(item) or 90),
            freshness_score=80.0,
            times_recommended=0,
            personal_rating=float(item.personal_rating) if item.personal_rating else None,
        )
        for index, item in enumerate(media_items, start=1)
    ]


def _estimate_media_time(item: MediaItem | None) -> int | None:
    if item is None:
        return None
    if item.runtime_minutes:
        return item.runtime_minutes
    if item.audiobook_length_minutes:
        return item.audiobook_length_minutes
    if item.page_count:
        return item.page_count * 2
    if item.episode_count:
        per_episode = 24 if item.media_type == MediaItem.MediaType.ANIME else 45
        return item.episode_count * per_episode
    return None


def _fits_time(candidate: TonightCandidate, context: TonightContext) -> bool:
    if candidate.estimated_time_minutes is None:
        return True
    if context.focus_level == "low" and candidate.estimated_time_minutes > max(
        context.available_minutes, 75
    ):
        return False
    return candidate.estimated_time_minutes <= max(context.available_minutes, 1)


def _score_candidate(candidate: TonightCandidate, context: TonightContext) -> dict[str, object]:
    score = 40.0
    score += _priority_score(candidate.priority)
    score += _time_score(candidate, context)
    score += _energy_score(candidate, context)
    score += _focus_score(candidate, context)
    score += _desired_effect_score(candidate, context)
    score += _risk_score(candidate, context)
    score += _media_preference_score(candidate, context)
    score += _personal_rating_score(candidate)
    score += _queue_v2_context_score(candidate, context)
    score -= min(candidate.queue_position, 20) * 0.25
    slot = _recommendation_slot(candidate, context)
    score = round(max(score, 0.0), 2)
    return {
        "slot": slot,
        "source": candidate.source,
        "title": candidate.title,
        "mediaType": candidate.media_type,
        "reason": _recommendation_reason(candidate, context, slot),
        "score": score,
        "estimatedTimeMinutes": candidate.estimated_time_minutes,
        "queueItemId": candidate.queue_item_id,
        "mediaItemId": candidate.media_item_id,
        "candidateId": candidate.candidate_id,
        "priority": candidate.priority,
        "moodCompatibility": candidate.mood_compatibility,
        "intensityLevel": candidate.intensity_level,
        "complexityLevel": candidate.complexity_level,
        "commitmentLevel": candidate.commitment_level,
        "freshnessScore": round(candidate.freshness_score, 2),
    }


def _priority_score(priority: str | None) -> float:
    return {"start_soon": 18.0, "sample_first": 10.0, "later": 2.0, None: 8.0}.get(priority, 0.0)


def _time_score(candidate: TonightCandidate, context: TonightContext) -> float:
    if candidate.estimated_time_minutes is None:
        return 4.0
    remaining = context.available_minutes - candidate.estimated_time_minutes
    if remaining >= 20:
        return 14.0
    if remaining >= 0:
        return 10.0
    return -30.0


def _energy_score(candidate: TonightCandidate, context: TonightContext) -> float:
    duration = candidate.estimated_time_minutes or context.available_minutes
    if context.energy_level == "low":
        if candidate.media_type == MediaItem.MediaType.AUDIOBOOK:
            return 12.0
        return 10.0 if duration <= 90 else -8.0
    if context.energy_level == "high":
        return 8.0 if duration >= 75 else 4.0
    return 6.0


def _focus_score(candidate: TonightCandidate, context: TonightContext) -> float:
    duration = candidate.estimated_time_minutes or context.available_minutes
    if context.focus_level == "low":
        return (
            10.0
            if duration <= 75 or candidate.media_type == MediaItem.MediaType.AUDIOBOOK
            else -10.0
        )
    if context.focus_level == "deep":
        if candidate.media_type in {MediaItem.MediaType.NOVEL, MediaItem.MediaType.MOVIE}:
            return 10.0
        return 7.0 if duration >= 90 else 3.0
    return 6.0


def _desired_effect_score(candidate: TonightCandidate, context: TonightContext) -> float:
    text = f"{candidate.reason_text} {candidate.best_mood} {candidate.title}".casefold()
    effect_keywords = {
        "comfort": {"comfort", "cozy", "warm", "easy", "familiar", "calm"},
        "quality": {"quality", "dense", "excellent", "canon", "masterpiece", "strong"},
        "surprise": {"surprise", "weird", "fresh", "wildcard", "strange", "unexpected"},
        "light": {"light", "short", "fun", "low", "easy", "sample"},
        "deep": {"deep", "focus", "dense", "serious", "literary", "complex"},
    }
    keywords = effect_keywords.get(context.desired_effect, set())
    if any(keyword in text for keyword in keywords):
        return 12.0
    if context.desired_effect == "light" and (candidate.estimated_time_minutes or 999) <= 75:
        return 8.0
    if context.desired_effect == "deep" and candidate.media_type in {
        MediaItem.MediaType.NOVEL,
        MediaItem.MediaType.MOVIE,
    }:
        return 7.0
    return 3.0


def _risk_score(candidate: TonightCandidate, context: TonightContext) -> float:
    if context.risk_tolerance == "low":
        return 10.0 if candidate.priority in {"start_soon", None} else -4.0
    if context.risk_tolerance == "high":
        return (
            10.0
            if candidate.priority == "sample_first" or candidate.source == "planned_media"
            else 3.0
        )
    return 6.0


def _media_preference_score(candidate: TonightCandidate, context: TonightContext) -> float:
    if not context.preferred_media_types:
        return 4.0
    return 12.0 if candidate.media_type in context.preferred_media_types else -6.0


def _personal_rating_score(candidate: TonightCandidate) -> float:
    if candidate.personal_rating is None:
        return 0.0
    return min(max(candidate.personal_rating - 5.0, 0.0), 5.0)


def _recommendation_slot(
    candidate: TonightCandidate, context: TonightContext
) -> RecommendationSlot:
    if candidate.priority == "sample_first" or context.risk_tolerance == "high":
        return "challenging"
    if candidate.priority == "later" or candidate.source == "planned_media":
        return "wildcard"
    return "safe"


def _recommendation_reason(candidate: TonightCandidate, context: TonightContext, slot: str) -> str:
    time_text = (
        f"fits within {context.available_minutes} minutes"
        if candidate.estimated_time_minutes is not None
        else "has unknown time cost, so treat it as flexible"
    )
    source_text = (
        "already in your adaptive queue"
        if candidate.source == "queue"
        else "planned in your library"
    )
    slot_text = {
        "safe": "safe choice",
        "challenging": "challenging choice",
        "wildcard": "wildcard",
    }[slot]
    reason = candidate.reason_text or candidate.best_mood or "No prior reason recorded."
    return (
        f"{candidate.title} is the {slot_text}: it {time_text}, is {source_text}, "
        f"and matches {context.energy_level} energy / {context.focus_level} focus. "
        f"Queue v2 fit: {candidate.mood_compatibility}% mood compatibility, "
        f"{candidate.commitment_level}/10 commitment, {candidate.freshness_score:.0f}% freshness. "
        f"Prior signal: {reason}"
    )


def _first_available_for_slot(
    choices: list[dict[str, object]],
    slot: str,
    used_keys: set[tuple[str | None, str | None, str]],
) -> dict[str, object] | None:
    for choice in choices:
        if choice["slot"] == slot and _dedupe_key(choice) not in used_keys:
            return choice
    return None


def _dedupe_key(choice: dict[str, object]) -> tuple[str | None, str | None, str]:
    return (
        choice.get("mediaItemId") if isinstance(choice.get("mediaItemId"), str) else None,
        choice.get("candidateId") if isinstance(choice.get("candidateId"), str) else None,
        str(choice["title"]),
    )


def _slot_order(slot: str) -> int:
    return {"safe": 0, "challenging": 1, "wildcard": 2}.get(slot, 3)


def _queue_v2_context_score(candidate: TonightCandidate, context: TonightContext) -> float:
    score = 0.0
    score += (candidate.mood_compatibility - 50) * 0.16
    score += (candidate.freshness_score - 50) * 0.1

    if context.energy_level == "low":
        score += 8.0 if candidate.intensity_level <= 4 else -candidate.intensity_level
        score += 6.0 if candidate.commitment_level <= 4 else -(candidate.commitment_level * 1.2)
    elif context.energy_level == "high":
        score += 6.0 if candidate.intensity_level >= 6 else 2.0
    else:
        score += 5.0 if 3 <= candidate.intensity_level <= 7 else -2.0

    if context.focus_level == "low":
        score += 8.0 if candidate.complexity_level <= 5 else -(candidate.complexity_level * 1.1)
    elif context.focus_level == "deep":
        score += 8.0 if candidate.complexity_level >= 6 else 2.0
    else:
        score += 5.0 if 3 <= candidate.complexity_level <= 7 else -2.0

    if candidate.times_recommended >= 3:
        score -= min(candidate.times_recommended * 2.0, 12.0)
    return score


def _mark_queue_items_recommended(recommendations: list[dict[str, object]]) -> None:
    queue_item_ids = [
        recommendation["queueItemId"]
        for recommendation in recommendations
        if isinstance(recommendation.get("queueItemId"), str)
    ]
    if not queue_item_ids:
        return
    now = timezone.now()
    QueueItem.objects.filter(id__in=queue_item_ids).update(
        last_recommended_at=now,
        times_recommended=models.F("times_recommended") + 1,
    )


def _default_duration_for_media_type(media_type: str) -> int:
    return {
        MediaItem.MediaType.MOVIE: 110,
        MediaItem.MediaType.TV_SHOW: 480,
        MediaItem.MediaType.ANIME: 240,
        MediaItem.MediaType.NOVEL: 420,
        MediaItem.MediaType.AUDIOBOOK: 360,
    }.get(media_type, 120)


def _commitment_from_duration(duration: int | None) -> int:
    if duration is None:
        return 5
    if duration <= 45:
        return 2
    if duration <= 100:
        return 4
    if duration <= 180:
        return 6
    if duration <= 360:
        return 8
    return 10


def _decayed_freshness(item: QueueItem, *, now) -> float:  # noqa: ANN001
    created_at = item.created_at or now
    age_days = max((now - created_at).days, 0)
    recommended_recently_penalty = 0.0
    if item.last_recommended_at:
        days_since_recommended = max((now - item.last_recommended_at).days, 0)
        recommended_recently_penalty = max(0, 10 - days_since_recommended) * 1.8
    freshness = (
        100.0
        - min(age_days * 0.5, 22.0)
        - min(item.times_recommended * 12.0, 42.0)
        - recommended_recently_penalty
        - max(item.commitment_level - 7, 0) * 3.0
    )
    return _clamp(freshness, 0, 100)


def _should_archive(item: QueueItem, score: float, freshness: float) -> bool:
    if item.is_archived:
        return True
    if score < 30:
        return True
    if freshness < 24 and item.times_recommended >= 2:
        return True
    return item.priority == QueueItem.Priority.LATER and score < 38


def _priority_from_score(score: float, archived: bool) -> str:
    if archived:
        return QueueItem.Priority.LATER
    if score >= 70:
        return QueueItem.Priority.START_SOON
    if score >= 48:
        return QueueItem.Priority.SAMPLE_FIRST
    return QueueItem.Priority.LATER


def _score_reason(item: QueueItem, score: float, freshness: float, archived: bool) -> str:
    if archived:
        return (
            f"Archived because its queue fit is {score:.0f}/100 with "
            f"{freshness:.0f}% freshness after repeated or high-commitment exposure."
        )
    if score >= 70:
        return f"Promoted because mood fit and freshness are strong ({score:.0f}/100)."
    if score >= 48:
        return f"Kept for sampling because fit is promising but not urgent ({score:.0f}/100)."
    return f"Delayed because commitment, fatigue, or low freshness lowered fit ({score:.0f}/100)."


def _top_queue_insight(items: list[QueueItem], score_by_id: dict[str, QueueScore]) -> str:
    active_items = [item for item in items if not item.is_archived]
    if not active_items:
        return "No active queue items are ready; add or restore items before Tonight Mode."
    top = max(active_items, key=lambda item: score_by_id[str(item.id)].score)
    score = score_by_id[str(top.id)]
    return f"{top.title} is currently strongest at {score.score:.0f}/100: {score.reason}"


def _fatigue_warnings(items: list[QueueItem]) -> list[str]:
    warnings: list[str] = []
    repeated = [item for item in items if item.times_recommended >= 3 and not item.is_archived]
    stale = [item for item in items if item.freshness_score < 40 and not item.is_archived]
    high_commitment = [
        item
        for item in items
        if item.commitment_level >= 8 and item.priority == QueueItem.Priority.START_SOON
    ]
    if repeated:
        warnings.append(
            f"{len(repeated)} active item(s) have been recommended repeatedly; "
            "consider sampling or archiving them."
        )
    if stale:
        warnings.append(f"{len(stale)} active item(s) have low freshness and may be queue clutter.")
    if high_commitment:
        warnings.append(
            f"{len(high_commitment)} high-commitment item(s) are still Start Soon; "
            "check mood and time before starting."
        )
    return warnings


def _clamp(value: float, lower: float, upper: float) -> float:
    return min(max(value, lower), upper)
