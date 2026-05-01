from __future__ import annotations

import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from canonos.media.models import MediaItem
from canonos.taste.models import MediaScore
from canonos.taste.services import seed_default_taste_dimensions

pytestmark = pytest.mark.django_db


def create_user(email: str = "dashboard@example.com") -> User:
    return User.objects.create_user(username=email, email=email, password="strong-password")


def authenticated_client(user: User | None = None) -> tuple[APIClient, User]:
    user = user or create_user()
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


def test_dashboard_summary_counts_activity_ratings_and_taste_signals() -> None:
    client, user = authenticated_client()
    dimensions = seed_default_taste_dimensions(user)
    story = next(dimension for dimension in dimensions if dimension.slug == "story_depth")
    atmosphere = next(dimension for dimension in dimensions if dimension.slug == "atmosphere")
    completed = MediaItem.objects.create(
        owner=user,
        title="Stalker",
        media_type="movie",
        status="completed",
        personal_rating="9.5",
    )
    planned = MediaItem.objects.create(
        owner=user,
        title="Mushishi",
        media_type="anime",
        status="planned",
    )
    MediaItem.objects.create(
        owner=user,
        title="Dropped show",
        media_type="tv_show",
        status="dropped",
        personal_rating="4.0",
    )
    MediaScore.objects.create(media_item=completed, taste_dimension=story, score="9.0")
    MediaScore.objects.create(media_item=completed, taste_dimension=atmosphere, score="10.0")
    MediaScore.objects.create(media_item=planned, taste_dimension=atmosphere, score="8.0")
    other_user = create_user("other@example.com")
    MediaItem.objects.create(
        owner=other_user,
        title="Other item",
        media_type="movie",
        status="completed",
        personal_rating="10.0",
    )

    response = client.get(reverse("dashboard-summary"))

    assert response.status_code == status.HTTP_200_OK
    payload = response.json()
    assert payload["counts"] == {
        "totalMedia": 3,
        "completedMedia": 1,
        "plannedMedia": 1,
        "droppedMedia": 1,
    }
    assert {row["mediaType"]: row["count"] for row in payload["mediaTypeBreakdown"]} == {
        "anime": 1,
        "movie": 1,
        "tv_show": 1,
    }
    assert payload["highestRated"][0]["title"] == "Stalker"
    assert len(payload["recentActivity"]) == 3
    assert payload["topTasteSignals"][0]["dimensionSlug"] == "atmosphere"
    assert payload["topTasteSignals"][0]["scoreCount"] == 2


def test_empty_dashboard_summary() -> None:
    client, _ = authenticated_client()

    response = client.get(reverse("dashboard-summary"))

    assert response.status_code == status.HTTP_200_OK
    payload = response.json()
    assert payload["counts"] == {
        "totalMedia": 0,
        "completedMedia": 0,
        "plannedMedia": 0,
        "droppedMedia": 0,
    }
    assert payload["mediaTypeBreakdown"] == []
    assert payload["recentActivity"] == []
    assert payload["highestRated"] == []
    assert payload["topTasteSignals"] == []


def test_dashboard_endpoint_appears_in_openapi_schema() -> None:
    response = APIClient().get(reverse("schema"))

    assert response.status_code == status.HTTP_200_OK
    assert "/api/dashboard/summary/" in response.content.decode()
