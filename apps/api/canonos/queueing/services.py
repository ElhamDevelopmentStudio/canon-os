from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from django.contrib.auth.models import AbstractUser

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
    personal_rating: float | None = None


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

    return recommendations[:5]


def _collect_queue_candidates(user: AbstractUser) -> list[TonightCandidate]:
    items = (
        QueueItem.objects.filter(owner=user)
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
