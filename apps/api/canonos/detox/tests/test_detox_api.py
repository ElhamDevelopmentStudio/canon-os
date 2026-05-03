from __future__ import annotations

import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from canonos.accounts.models import UserSettings
from canonos.detox.models import DetoxDecision, DetoxRule
from canonos.detox.services import evaluate_detox, get_rules_for_user, get_time_saved_summary
from canonos.media.models import MediaItem

pytestmark = pytest.mark.django_db


def create_user(email: str = "detox@example.com") -> User:
    return User.objects.create_user(username=email, email=email, password="strong-password")


def authenticated_client(user: User | None = None) -> tuple[APIClient, User]:
    user = user or create_user()
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


def create_media(
    user: User,
    *,
    title: str = "Low pull movie",
    media_type: str = MediaItem.MediaType.MOVIE,
    status_value: str = MediaItem.ConsumptionStatus.CONSUMING,
    personal_rating: int = 4,
) -> MediaItem:
    return MediaItem.objects.create(
        owner=user,
        title=title,
        media_type=media_type,
        status=status_value,
        runtime_minutes=120,
        episode_count=12,
        page_count=300,
        personal_rating=personal_rating,
    )


def test_default_detox_rules_are_seeded_and_owner_scoped() -> None:
    user = create_user()
    other = create_user("detox-other@example.com")

    rules = get_rules_for_user(user)
    get_rules_for_user(other)

    assert len(rules) == 4
    assert {rule.key for rule in rules} >= {
        "movie_30_minute_sample",
        "tv_two_episode_sample",
        "anime_three_episode_sample",
        "novel_50_page_sample",
    }
    assert DetoxRule.objects.filter(owner=user).count() == 4
    assert DetoxRule.objects.filter(owner=other).count() == 4
    assert set(DetoxRule.objects.filter(owner=user).values_list("id", flat=True)).isdisjoint(
        set(DetoxRule.objects.filter(owner=other).values_list("id", flat=True)),
    )


def test_detox_evaluation_recommends_drop_and_estimates_time_saved() -> None:
    user = create_user("detox-evaluate@example.com")
    media = create_media(user)

    decision = evaluate_detox(user, media, progress_value=35, motivation_score=2)

    assert decision.decision == DetoxDecision.Decision.DROP
    assert decision.rule is not None
    assert decision.rule.key == "movie_30_minute_sample"
    assert decision.estimated_time_saved_minutes == 85
    assert "practical option" in decision.reason


def test_detox_evaluation_handles_tv_show_sample_rule() -> None:
    user = create_user("detox-show@example.com")
    media = create_media(user, title="Low pull show", media_type=MediaItem.MediaType.TV_SHOW)

    decision = evaluate_detox(user, media, progress_value=2, motivation_score=2)

    assert decision.decision == DetoxDecision.Decision.DROP
    assert decision.rule is not None
    assert decision.rule.key == "tv_two_episode_sample"
    assert decision.estimated_time_saved_minutes == 450


def test_disabled_rule_changes_detox_behavior() -> None:
    user = create_user("detox-disabled@example.com")
    media = create_media(user)
    get_rules_for_user(user)
    DetoxRule.objects.filter(owner=user, key="movie_30_minute_sample").update(is_enabled=False)

    decision = evaluate_detox(user, media, progress_value=35, motivation_score=2)

    assert decision.decision == DetoxDecision.Decision.CONTINUE
    assert decision.rule is None
    assert decision.estimated_time_saved_minutes == 0


def test_completion_detox_strictness_changes_boundary_decision() -> None:
    user = create_user("detox-strictness@example.com")
    UserSettings.objects.create(user=user, completion_detox_strictness=10)
    media = create_media(user, personal_rating=4)

    strict_decision = evaluate_detox(user, media, progress_value=35, motivation_score=6)

    assert strict_decision.decision == DetoxDecision.Decision.DROP
    assert strict_decision.rule is not None

    relaxed = create_user("detox-relaxed@example.com")
    UserSettings.objects.create(user=relaxed, completion_detox_strictness=0)
    relaxed_media = create_media(relaxed, title="Relaxed movie", personal_rating=4)
    relaxed_decision = evaluate_detox(relaxed, relaxed_media, progress_value=35, motivation_score=6)

    assert relaxed_decision.decision == DetoxDecision.Decision.CONTINUE


def test_time_saved_summary_counts_drop_pause_delay_archive_decisions() -> None:
    user = create_user("detox-summary@example.com")
    media = create_media(user)
    evaluate_detox(user, media, progress_value=35, motivation_score=2)
    evaluate_detox(user, media, progress_value=35, motivation_score=9)

    summary = get_time_saved_summary(user)

    assert summary["totalMinutes"] == 85
    assert summary["currentMonthMinutes"] == 85
    assert summary["decisionCount"] == 1
    assert summary["entries"][0]["mediaItemTitle"] == media.title


def test_detox_endpoints_support_rules_evaluation_decisions_and_summary() -> None:
    client, user = authenticated_client()
    media = create_media(user)

    rules_response = client.get(reverse("detox-rule-list"))
    assert rules_response.status_code == status.HTTP_200_OK
    rules = rules_response.json()["results"]
    movie_rule = next(rule for rule in rules if rule["key"] == "movie_30_minute_sample")
    assert movie_rule["mediaType"] == "movie"
    assert movie_rule["isEnabled"] is True

    update_response = client.patch(
        reverse("detox-rule-detail", args=[movie_rule["id"]]),
        {"isEnabled": False},
        format="json",
    )
    assert update_response.status_code == status.HTTP_200_OK
    assert update_response.json()["isEnabled"] is False

    continue_response = client.post(
        reverse("detox-evaluate"),
        {"mediaItemId": str(media.id), "progressValue": 35, "motivationScore": 2},
        format="json",
    )
    assert continue_response.status_code == status.HTTP_201_CREATED
    assert continue_response.json()["decision"]["decision"] == "continue"

    reset_response = client.post(reverse("detox-rule-reset"), format="json")
    assert reset_response.status_code == status.HTTP_200_OK
    assert DetoxRule.objects.get(owner=user, key="movie_30_minute_sample").is_enabled is True

    drop_response = client.post(
        reverse("detox-evaluate"),
        {"mediaItemId": str(media.id), "progressValue": 35, "motivationScore": 2},
        format="json",
    )
    assert drop_response.status_code == status.HTTP_201_CREATED
    assert drop_response.json()["decision"]["decision"] == "drop"
    assert drop_response.json()["timeSavedSummary"]["totalMinutes"] == 85

    decisions_response = client.get(reverse("detox-decision-list"))
    assert decisions_response.status_code == status.HTTP_200_OK
    assert decisions_response.json()["count"] == 2

    summary_response = client.get(reverse("detox-time-saved"))
    assert summary_response.status_code == status.HTTP_200_OK
    assert summary_response.json()["totalMinutes"] == 85


def test_detox_decisions_are_owner_scoped() -> None:
    client, user = authenticated_client()
    other = create_user("detox-owner-other@example.com")
    owned = create_media(user, title="Owned movie")
    other_media = create_media(other, title="Other movie")
    evaluate_detox(user, owned, progress_value=35, motivation_score=2)
    evaluate_detox(other, other_media, progress_value=35, motivation_score=2)

    list_response = client.get(reverse("detox-decision-list"))
    assert list_response.status_code == status.HTTP_200_OK
    payload = list_response.json()
    assert payload["count"] == 1
    assert payload["results"][0]["mediaItemTitle"] == "Owned movie"

    forbidden_response = client.post(
        reverse("detox-evaluate"),
        {"mediaItemId": str(other_media.id), "progressValue": 35, "motivationScore": 2},
        format="json",
    )
    assert forbidden_response.status_code == status.HTTP_404_NOT_FOUND
