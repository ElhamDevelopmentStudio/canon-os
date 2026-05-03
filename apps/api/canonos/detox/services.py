from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from canonos.accounts.models import UserSettings
from canonos.media.models import MediaItem

from .models import DetoxDecision, DetoxRule


@dataclass(frozen=True)
class DefaultDetoxRule:
    key: str
    name: str
    description: str
    media_type: str | None
    sample_limit: int
    condition: dict[str, object]


DEFAULT_DETOX_RULES: tuple[DefaultDetoxRule, ...] = (
    DefaultDetoxRule(
        key="movie_30_minute_sample",
        name="Movie 30 minute sample",
        description=(
            "At about 30 minutes, check whether the movie has enough pull to deserve "
            "the remaining runtime."
        ),
        media_type=MediaItem.MediaType.MOVIE,
        sample_limit=30,
        condition={
            "maxMotivation": 4,
            "eligibleStatuses": [
                MediaItem.ConsumptionStatus.PLANNED,
                MediaItem.ConsumptionStatus.CONSUMING,
            ],
        },
    ),
    DefaultDetoxRule(
        key="tv_two_episode_sample",
        name="TV two episode sample",
        description=(
            "After two episodes, pause or drop if you are continuing mostly from inertia."
        ),
        media_type=MediaItem.MediaType.TV_SHOW,
        sample_limit=2,
        condition={
            "maxMotivation": 4,
            "eligibleStatuses": [
                MediaItem.ConsumptionStatus.PLANNED,
                MediaItem.ConsumptionStatus.CONSUMING,
            ],
        },
    ),
    DefaultDetoxRule(
        key="anime_three_episode_sample",
        name="Anime three episode sample",
        description=(
            "Use the three-episode mark as a neutral checkpoint before investing in a longer run."
        ),
        media_type=MediaItem.MediaType.ANIME,
        sample_limit=3,
        condition={
            "maxMotivation": 4,
            "eligibleStatuses": [
                MediaItem.ConsumptionStatus.PLANNED,
                MediaItem.ConsumptionStatus.CONSUMING,
            ],
        },
    ),
    DefaultDetoxRule(
        key="novel_50_page_sample",
        name="Novel 50 page sample",
        description=(
            "At about 50 pages, decide whether curiosity is present enough for the full book."
        ),
        media_type=MediaItem.MediaType.NOVEL,
        sample_limit=50,
        condition={
            "maxMotivation": 4,
            "eligibleStatuses": [
                MediaItem.ConsumptionStatus.PLANNED,
                MediaItem.ConsumptionStatus.CONSUMING,
            ],
        },
    ),
)

TIME_SAVING_DECISIONS = {
    DetoxDecision.Decision.DROP,
    DetoxDecision.Decision.PAUSE,
    DetoxDecision.Decision.DELAY,
    DetoxDecision.Decision.ARCHIVE,
}


def ensure_default_rules(user: User, *, reset: bool = False) -> list[DetoxRule]:
    if reset:
        DetoxRule.objects.filter(owner=user).delete()
    rules = []
    for rule in DEFAULT_DETOX_RULES:
        obj, _ = DetoxRule.objects.update_or_create(
            owner=user,
            key=rule.key,
            defaults={
                "name": rule.name,
                "description": rule.description,
                "media_type": rule.media_type,
                "sample_limit": rule.sample_limit,
                "condition": rule.condition,
                "is_enabled": True,
            },
        )
        rules.append(obj)
    return rules


def get_rules_for_user(user: User) -> list[DetoxRule]:
    if not DetoxRule.objects.filter(owner=user).exists():
        ensure_default_rules(user)
    return list(DetoxRule.objects.filter(owner=user))


def reset_rules_for_user(user: User) -> list[DetoxRule]:
    with transaction.atomic():
        return ensure_default_rules(user, reset=True)


def evaluate_detox(
    user: User,
    media_item: MediaItem,
    *,
    progress_value: int,
    motivation_score: int,
) -> DetoxDecision:
    rules = [rule for rule in get_rules_for_user(user) if rule.is_enabled]
    matched_rule = _best_matching_rule(media_item, progress_value, rules)
    settings, _ = UserSettings.objects.get_or_create(user=user)
    decision, reason = _decision_for(
        media_item,
        matched_rule,
        progress_value,
        motivation_score,
        completion_detox_strictness=settings.completion_detox_strictness,
    )
    estimated_time_saved = _estimated_time_saved(media_item, progress_value, decision)
    return DetoxDecision.objects.create(
        media_item=media_item,
        rule=matched_rule,
        decision=decision,
        reason=reason,
        estimated_time_saved_minutes=estimated_time_saved,
        progress_value=progress_value,
        motivation_score=motivation_score,
    )


def get_time_saved_summary(user: User) -> dict[str, object]:
    queryset = DetoxDecision.objects.filter(
        media_item__owner=user,
        decision__in=TIME_SAVING_DECISIONS,
        estimated_time_saved_minutes__gt=0,
    ).select_related("media_item")
    now = timezone.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    next_month = (month_start + timedelta(days=32)).replace(day=1)
    total_minutes = queryset.aggregate(total=Sum("estimated_time_saved_minutes"))["total"] or 0
    current_month_minutes = (
        queryset.filter(created_at__gte=month_start, created_at__lt=next_month).aggregate(
            total=Sum("estimated_time_saved_minutes"),
        )["total"]
        or 0
    )
    recent = list(queryset.order_by("-created_at")[:10])
    return {
        "totalMinutes": int(total_minutes),
        "currentMonthMinutes": int(current_month_minutes),
        "decisionCount": queryset.count(),
        "entries": [_time_saved_entry(decision) for decision in recent],
    }


def _best_matching_rule(
    media_item: MediaItem,
    progress_value: int,
    rules: list[DetoxRule],
) -> DetoxRule | None:
    eligible = [
        rule
        for rule in rules
        if (rule.media_type is None or rule.media_type == media_item.media_type)
        and _status_allowed(media_item, rule)
        and progress_value >= rule.sample_limit
        and progress_value >= _condition_int(rule.condition, "minProgress", rule.sample_limit)
        and progress_value <= _condition_int(rule.condition, "maxProgress", 1_000_000)
    ]
    if not eligible:
        return None
    return sorted(
        eligible,
        key=lambda rule: (
            rule.media_type == media_item.media_type,
            rule.sample_limit,
            rule.updated_at,
        ),
        reverse=True,
    )[0]


def _decision_for(
    media_item: MediaItem,
    rule: DetoxRule | None,
    progress_value: int,
    motivation_score: int,
    *,
    completion_detox_strictness: int = 5,
) -> tuple[str, str]:
    if rule is None:
        return (
            DetoxDecision.Decision.CONTINUE,
            (
                "No active sample boundary has been reached yet. Continue only if "
                "curiosity is still present."
            ),
        )

    strictness_adjustment = round((completion_detox_strictness - 5) * 0.4)
    max_motivation = _condition_int(rule.condition, "maxMotivation", 4) + strictness_adjustment
    max_motivation = min(max(max_motivation, 1), 10)
    low_rating = media_item.personal_rating is not None and float(media_item.personal_rating) <= 5
    has_long_runtime = _estimated_total_minutes(media_item) >= 90
    if motivation_score <= max_motivation and (low_rating or has_long_runtime):
        return (
            DetoxDecision.Decision.DROP,
            (
                f"{rule.name} matched and motivation is {motivation_score}/10. "
                "Dropping is a practical option if the work is not giving enough back."
            ),
        )
    if motivation_score <= max_motivation + 2:
        return (
            DetoxDecision.Decision.PAUSE,
            (
                f"{rule.name} matched, but motivation is not clearly absent. "
                "Pause and revisit later if interest returns."
            ),
        )
    return (
        DetoxDecision.Decision.CONTINUE,
        (
            f"{rule.name} matched, and motivation is still {motivation_score}/10. "
            "Continuing is reasonable if the next session still feels voluntary."
        ),
    )


def _status_allowed(media_item: MediaItem, rule: DetoxRule) -> bool:
    statuses = rule.condition.get("eligibleStatuses") if isinstance(rule.condition, dict) else None
    if not isinstance(statuses, list) or not statuses:
        return True
    return media_item.status in {str(status) for status in statuses}


def _condition_int(condition: dict[str, Any], key: str, default: int) -> int:
    value = condition.get(key) if isinstance(condition, dict) else None
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _estimated_time_saved(media_item: MediaItem, progress_value: int, decision: str) -> int:
    if decision not in TIME_SAVING_DECISIONS:
        return 0
    total = _estimated_total_minutes(media_item)
    consumed = _estimated_consumed_minutes(media_item, progress_value)
    remaining = max(total - consumed, 0)
    if decision == DetoxDecision.Decision.PAUSE:
        return min(remaining, 120)
    return remaining


def _estimated_total_minutes(media_item: MediaItem) -> int:
    if media_item.media_type == MediaItem.MediaType.MOVIE:
        return media_item.runtime_minutes or 120
    if media_item.media_type == MediaItem.MediaType.TV_SHOW:
        return (media_item.episode_count or 8) * 45
    if media_item.media_type == MediaItem.MediaType.ANIME:
        return (media_item.episode_count or 12) * 24
    if media_item.media_type == MediaItem.MediaType.NOVEL:
        return (media_item.page_count or 300) * 2
    if media_item.media_type == MediaItem.MediaType.AUDIOBOOK:
        return media_item.audiobook_length_minutes or 600
    return 120


def _estimated_consumed_minutes(media_item: MediaItem, progress_value: int) -> int:
    if media_item.media_type == MediaItem.MediaType.MOVIE:
        return progress_value
    if media_item.media_type == MediaItem.MediaType.TV_SHOW:
        return progress_value * 45
    if media_item.media_type == MediaItem.MediaType.ANIME:
        return progress_value * 24
    if media_item.media_type == MediaItem.MediaType.NOVEL:
        return progress_value * 2
    if media_item.media_type == MediaItem.MediaType.AUDIOBOOK:
        return progress_value
    return progress_value


def _time_saved_entry(decision: DetoxDecision) -> dict[str, object]:
    return {
        "decisionId": str(decision.id),
        "mediaItemId": str(decision.media_item_id),
        "mediaItemTitle": decision.media_item.title,
        "decision": decision.decision,
        "estimatedTimeSavedMinutes": decision.estimated_time_saved_minutes,
        "createdAt": decision.created_at.isoformat().replace("+00:00", "Z"),
    }
