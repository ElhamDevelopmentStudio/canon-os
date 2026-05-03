from __future__ import annotations

from datetime import date

import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from canonos.aftertaste.models import AftertasteEntry
from canonos.evolution.models import TasteEvolutionSnapshot
from canonos.media.models import MediaItem
from canonos.taste.models import MediaScore
from canonos.taste.services import seed_default_taste_dimensions

pytestmark = pytest.mark.django_db


def create_user(email: str = "evolution@example.com") -> User:
    return User.objects.create_user(username=email, email=email, password="strong-password")


def authenticated_client(user: User | None = None) -> tuple[APIClient, User]:
    user = user or create_user()
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


def create_completed_media(
    user: User,
    *,
    title: str,
    completed_date: date,
    rating: str,
    media_type: str = MediaItem.MediaType.MOVIE,
) -> MediaItem:
    return MediaItem.objects.create(
        owner=user,
        title=title,
        media_type=media_type,
        status=MediaItem.ConsumptionStatus.COMPLETED,
        completed_date=completed_date,
        personal_rating=rating,
    )


def add_scores(
    user: User, media_item: MediaItem, *, story: str, genericness: str, regret: str
) -> None:
    dimensions = seed_default_taste_dimensions(user)
    by_slug = {dimension.slug: dimension for dimension in dimensions}
    MediaScore.objects.create(
        media_item=media_item, taste_dimension=by_slug["story_depth"], score=story
    )
    MediaScore.objects.create(
        media_item=media_item, taste_dimension=by_slug["genericness"], score=genericness
    )
    MediaScore.objects.create(
        media_item=media_item, taste_dimension=by_slug["regret_score"], score=regret
    )


def test_empty_timeline_returns_owner_scoped_list_shape() -> None:
    client, _ = authenticated_client()

    response = client.get(reverse("taste-evolution-timeline"))

    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"count": 0, "next": None, "previous": None, "results": []}


def test_generate_empty_snapshot_records_neutral_insight() -> None:
    client, user = authenticated_client()

    response = client.post(reverse("taste-evolution-generate"), {}, format="json")

    assert response.status_code == status.HTTP_201_CREATED
    payload = response.json()
    assert payload["snapshotPeriod"] == "monthly"
    assert payload["aggregateData"]["isEmpty"] is True
    assert payload["aggregateData"]["evidenceCounts"]["mediaCount"] == 0
    assert payload["insights"][0]["key"] == "insufficient_evidence"
    assert TasteEvolutionSnapshot.objects.filter(owner=user).count() == 1


def test_generate_snapshot_computes_monthly_taste_trends() -> None:
    client, user = authenticated_client()
    early = create_completed_media(
        user,
        title="Early classic",
        completed_date=date(2026, 1, 8),
        rating="6.5",
        media_type=MediaItem.MediaType.MOVIE,
    )
    latest = create_completed_media(
        user,
        title="Latest anime",
        completed_date=date(2026, 2, 12),
        rating="9.0",
        media_type=MediaItem.MediaType.ANIME,
    )
    add_scores(user, early, story="6.0", genericness="2.0", regret="1.0")
    add_scores(user, latest, story="9.0", genericness="8.0", regret="8.0")
    AftertasteEntry.objects.create(
        owner=user,
        media_item=early,
        worth_time=True,
        stayed_with_me_score=6,
        felt_alive=True,
        felt_generic=False,
        final_thoughts="Useful baseline.",
    )
    AftertasteEntry.objects.create(
        owner=user,
        media_item=latest,
        worth_time=False,
        stayed_with_me_score=9,
        felt_alive=False,
        felt_generic=True,
        final_thoughts="Stronger craft, but generic and regrettable.",
    )
    MediaItem.objects.create(
        owner=user,
        title="Fatigue pause",
        media_type=MediaItem.MediaType.TV_SHOW,
        status=MediaItem.ConsumptionStatus.PAUSED,
    )

    response = client.post(
        reverse("taste-evolution-generate"),
        {"snapshotDate": "2026-02-28"},
        format="json",
    )

    assert response.status_code == status.HTTP_201_CREATED
    payload = response.json()
    aggregate = payload["aggregateData"]
    assert aggregate["isEmpty"] is False
    assert aggregate["evidenceCounts"]["completedMediaCount"] == 2
    assert aggregate["ratingTrend"]["currentValue"] == 9.0
    assert aggregate["ratingTrend"]["previousValue"] == 6.5
    assert aggregate["mediaTypeTrend"]["currentValue"] == "Anime"
    assert aggregate["genericnessToleranceTrend"]["currentValue"] < 60
    assert aggregate["regretTrend"]["currentValue"] > 35
    assert aggregate["favoriteDimensionTrend"]["currentValue"] == "Story depth"
    insight_keys = {insight["key"] for insight in payload["insights"]}
    assert "rating_shift" in insight_keys
    assert "genericness_tolerance_low" in insight_keys


def test_timeline_is_owner_scoped_and_ordered_by_snapshot_date() -> None:
    client, user = authenticated_client()
    other_user = create_user("other-evolution@example.com")
    TasteEvolutionSnapshot.objects.create(
        owner=other_user,
        snapshot_period="monthly",
        snapshot_date=date(2026, 1, 31),
        aggregate_data={"isEmpty": True},
        insights=[],
    )
    first = TasteEvolutionSnapshot.objects.create(
        owner=user,
        snapshot_period="monthly",
        snapshot_date=date(2026, 1, 31),
        aggregate_data={"isEmpty": True},
        insights=[],
    )
    latest = TasteEvolutionSnapshot.objects.create(
        owner=user,
        snapshot_period="monthly",
        snapshot_date=date(2026, 2, 28),
        aggregate_data={"isEmpty": False},
        insights=[],
    )

    response = client.get(reverse("taste-evolution-timeline"))

    assert response.status_code == status.HTTP_200_OK
    payload = response.json()
    assert payload["count"] == 2
    assert [row["id"] for row in payload["results"]] == [str(latest.id), str(first.id)]


def test_taste_evolution_endpoints_appear_in_openapi_schema() -> None:
    response = APIClient().get(reverse("schema"))

    assert response.status_code == status.HTTP_200_OK
    content = response.content.decode()
    assert "/api/taste-evolution/" in content
    assert "/api/taste-evolution/generate/" in content
