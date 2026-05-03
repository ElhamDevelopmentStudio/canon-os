from __future__ import annotations

import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from canonos.accounts.models import UserSettings
from canonos.media.models import MediaItem
from canonos.queueing.models import QueueItem, TonightModeSession

pytestmark = pytest.mark.django_db


def create_user(email: str = "tonight@example.com") -> User:
    return User.objects.create_user(username=email, email=email, password="strong-password")


def authenticated_client(user: User | None = None) -> tuple[APIClient, User]:
    user = user or create_user()
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


def tonight_payload(**overrides):  # noqa: ANN003, ANN201
    payload = {
        "availableMinutes": 100,
        "energyLevel": "medium",
        "focusLevel": "medium",
        "desiredEffect": "quality",
        "preferredMediaTypes": ["movie", "anime", "novel"],
        "riskTolerance": "medium",
    }
    payload.update(overrides)
    return payload


def test_tonight_mode_empty_data_persists_session_with_no_recommendations() -> None:
    client, user = authenticated_client()

    response = client.post(reverse("tonightmode-generate"), tonight_payload(), format="json")

    assert response.status_code == status.HTTP_201_CREATED
    payload = response.json()
    assert payload["recommendations"] == []
    assert payload["safeChoice"] is None
    assert payload["challengingChoice"] is None
    assert payload["wildcardChoice"] is None
    session = TonightModeSession.objects.get(owner=user)
    assert session.available_minutes == 100
    assert session.generated_recommendations == []


def test_tonight_mode_time_filter_excludes_items_that_do_not_fit() -> None:
    client, user = authenticated_client()
    QueueItem.objects.create(
        owner=user,
        title="Short Film",
        media_type="movie",
        priority="start_soon",
        reason="Quality short option.",
        estimated_time_minutes=45,
        queue_position=1,
    )
    QueueItem.objects.create(
        owner=user,
        title="Long Series Arc",
        media_type="tv_show",
        priority="start_soon",
        reason="Too long tonight.",
        estimated_time_minutes=600,
        queue_position=2,
    )

    response = client.post(
        reverse("tonightmode-generate"),
        tonight_payload(availableMinutes=90, focusLevel="low"),
        format="json",
    )

    assert response.status_code == status.HTTP_201_CREATED
    titles = [recommendation["title"] for recommendation in response.json()["recommendations"]]
    assert "Short Film" in titles
    assert "Long Series Arc" not in titles


def test_tonight_mode_returns_three_recommendation_slots() -> None:
    client, user = authenticated_client()
    QueueItem.objects.create(
        owner=user,
        title="Reliable Film",
        media_type="movie",
        priority="start_soon",
        reason="High quality and focused.",
        estimated_time_minutes=95,
        mood_compatibility=88,
        commitment_level=5,
        freshness_score=100,
        queue_position=1,
    )
    QueueItem.objects.create(
        owner=user,
        title="Risky Anime Pilot",
        media_type="anime",
        priority="sample_first",
        reason="Surprising and weird sample.",
        estimated_time_minutes=24,
        mood_compatibility=78,
        intensity_level=8,
        complexity_level=6,
        commitment_level=2,
        freshness_score=100,
        queue_position=2,
    )
    MediaItem.objects.create(
        owner=user,
        title="Planned Novel",
        media_type="novel",
        status="planned",
        page_count=40,
        notes="Deep literary wildcard.",
    )

    response = client.post(
        reverse("tonightmode-generate"),
        tonight_payload(
            availableMinutes=120,
            focusLevel="deep",
            desiredEffect="deep",
            preferredMediaTypes=["movie", "anime", "novel"],
            riskTolerance="medium",
        ),
        format="json",
    )

    assert response.status_code == status.HTTP_201_CREATED
    payload = response.json()
    assert payload["safeChoice"]["slot"] == "safe"
    assert payload["safeChoice"]["moodCompatibility"] == 88
    assert payload["challengingChoice"]["slot"] == "challenging"
    assert payload["wildcardChoice"]["slot"] == "wildcard"
    assert len(payload["recommendations"]) >= 3
    assert TonightModeSession.objects.get(owner=user).generated_recommendations


def test_tonight_mode_excludes_archived_queue_items_and_uses_queue_v2_fields() -> None:
    client, user = authenticated_client()
    QueueItem.objects.create(
        owner=user,
        title="Fresh Short Choice",
        media_type="movie",
        priority="start_soon",
        reason="Fresh and compatible.",
        estimated_time_minutes=45,
        mood_compatibility=95,
        intensity_level=3,
        complexity_level=4,
        commitment_level=2,
        freshness_score=100,
        queue_position=1,
    )
    QueueItem.objects.create(
        owner=user,
        title="Archived Marathon",
        media_type="tv_show",
        priority="later",
        reason="Archived because it is too stale.",
        estimated_time_minutes=900,
        mood_compatibility=5,
        intensity_level=9,
        complexity_level=9,
        commitment_level=10,
        freshness_score=10,
        is_archived=True,
        queue_position=2,
    )

    response = client.post(
        reverse("tonightmode-generate"),
        tonight_payload(availableMinutes=1000, energyLevel="low", focusLevel="low"),
        format="json",
    )

    assert response.status_code == status.HTTP_201_CREATED
    recommendations = response.json()["recommendations"]
    titles = [item["title"] for item in recommendations]
    assert "Fresh Short Choice" in titles
    assert "Archived Marathon" not in titles
    assert recommendations[0]["moodCompatibility"] == 95


def test_tonight_mode_uses_saved_defaults_when_request_omits_them() -> None:
    client, user = authenticated_client()
    UserSettings.objects.create(
        user=user,
        default_media_types=["novel"],
        default_risk_tolerance="high",
    )
    MediaItem.objects.create(
        owner=user,
        title="Default Novel",
        media_type="novel",
        status="planned",
        page_count=30,
        notes="A weird literary wildcard.",
    )
    MediaItem.objects.create(
        owner=user,
        title="Default Movie",
        media_type="movie",
        status="planned",
        runtime_minutes=80,
        notes="A regular movie option.",
    )

    response = client.post(
        reverse("tonightmode-generate"),
        {
            "availableMinutes": 120,
            "energyLevel": "medium",
            "focusLevel": "deep",
            "desiredEffect": "deep",
        },
        format="json",
    )

    assert response.status_code == status.HTTP_201_CREATED
    session = response.json()["session"]
    assert session["preferredMediaTypes"] == ["novel"]
    assert session["riskTolerance"] == "high"
    recommendations = response.json()["recommendations"]
    assert any(item["title"] == "Default Novel" for item in recommendations)


def test_tonight_mode_schema_is_documented() -> None:
    response = APIClient().get(reverse("schema"))

    assert response.status_code == status.HTTP_200_OK
    content = response.content.decode()
    assert "/api/queue/tonight/" in content
