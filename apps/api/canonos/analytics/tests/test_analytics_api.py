from __future__ import annotations

from datetime import date

import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from canonos.media.models import MediaItem
from canonos.narrative.models import NarrativeAnalysis
from canonos.taste.models import MediaScore, TasteDimension

pytestmark = pytest.mark.django_db

ANALYTICS_ENDPOINTS = [
    "analytics-overview",
    "analytics-consumption-timeline",
    "analytics-rating-distribution",
    "analytics-media-type-distribution",
    "analytics-dimension-trends",
    "analytics-genericness-satisfaction",
    "analytics-regret-time-cost",
    "analytics-top-creators",
    "analytics-top-themes",
]


def create_user(email: str = "analytics@example.com") -> User:
    return User.objects.create_user(username=email, email=email, password="strong-password")


def authenticated_client(user: User | None = None) -> tuple[APIClient, User]:
    user = user or create_user()
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


def create_dimension(
    user: User, slug: str, name: str, direction: str = "positive"
) -> TasteDimension:
    return TasteDimension.objects.create(owner=user, slug=slug, name=name, direction=direction)


def test_analytics_endpoints_require_authentication() -> None:
    client = APIClient()

    for endpoint in ANALYTICS_ENDPOINTS:
        response = client.get(reverse(endpoint))
        assert response.status_code in {status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN}


def test_analytics_endpoints_return_empty_payloads() -> None:
    client, _ = authenticated_client()

    timeline = client.get(reverse("analytics-consumption-timeline"))
    ratings = client.get(reverse("analytics-rating-distribution"))
    media_types = client.get(reverse("analytics-media-type-distribution"))
    dimensions = client.get(reverse("analytics-dimension-trends"))
    genericness = client.get(reverse("analytics-genericness-satisfaction"))
    regret = client.get(reverse("analytics-regret-time-cost"))
    creators = client.get(reverse("analytics-top-creators"))
    themes = client.get(reverse("analytics-top-themes"))
    overview = client.get(reverse("analytics-overview"))

    for response in [
        timeline,
        ratings,
        media_types,
        dimensions,
        genericness,
        regret,
        creators,
        themes,
        overview,
    ]:
        assert response.status_code == status.HTTP_200_OK

    assert timeline.json()["isEmpty"] is True
    assert timeline.json()["points"] == []
    assert ratings.json()["ratedCount"] == 0
    assert sum(bucket["count"] for bucket in ratings.json()["buckets"]) == 0
    assert media_types.json()["totalCount"] == 0
    assert dimensions.json()["dimensions"] == []
    assert genericness.json()["points"] == []
    assert regret.json()["points"] == []
    assert creators.json()["results"] == []
    assert themes.json()["results"] == []
    assert overview.json()["consumptionTimeline"]["isEmpty"] is True
    assert overview.json()["topThemes"]["results"] == []


def test_analytics_endpoints_return_sample_data_and_stay_owner_scoped() -> None:
    client, user = authenticated_client(create_user("analytics-owner@example.com"))
    other_user = create_user("analytics-other@example.com")
    genericness = create_dimension(user, "genericness", "Genericness", "negative")
    regret = create_dimension(user, "regret_score", "Regret score", "negative")
    atmosphere = create_dimension(user, "atmosphere", "Atmosphere")

    movie = MediaItem.objects.create(
        owner=user,
        title="Stalker",
        media_type="movie",
        status="completed",
        creator="Andrei Tarkovsky",
        personal_rating="9.5",
        completed_date=date(2026, 1, 3),
        runtime_minutes=162,
    )
    novel = MediaItem.objects.create(
        owner=user,
        title="Roadside Picnic",
        media_type="novel",
        status="completed",
        creator="Strugatsky Brothers",
        personal_rating="8.0",
        completed_date=date(2026, 2, 4),
        page_count=224,
    )
    dropped = MediaItem.objects.create(
        owner=user,
        title="Forgettable Filler",
        media_type="tv_show",
        status="dropped",
        creator="Formula Studio",
        personal_rating="3.0",
        started_date=date(2026, 2, 8),
        episode_count=3,
    )
    MediaItem.objects.create(
        owner=other_user,
        title="Private Other Movie",
        media_type="movie",
        status="completed",
        creator="Other Creator",
        personal_rating="10.0",
        completed_date=date(2026, 1, 1),
    )

    MediaScore.objects.create(media_item=movie, taste_dimension=genericness, score="2.0")
    MediaScore.objects.create(media_item=movie, taste_dimension=regret, score="1.0")
    MediaScore.objects.create(media_item=movie, taste_dimension=atmosphere, score="9.5")
    MediaScore.objects.create(media_item=novel, taste_dimension=genericness, score="3.0")
    MediaScore.objects.create(media_item=novel, taste_dimension=atmosphere, score="8.0")
    MediaScore.objects.create(media_item=dropped, taste_dimension=genericness, score="9.0")
    MediaScore.objects.create(media_item=dropped, taste_dimension=regret, score="8.0")
    NarrativeAnalysis.objects.create(
        owner=user,
        media_item=movie,
        status=NarrativeAnalysis.Status.COMPLETED,
        analysis_summary="Atmospheric moral ambiguity and patient pacing.",
        extracted_traits=[
            {"key": "atmosphere", "label": "Atmosphere", "score": 96},
            {"key": "moral_ambiguity", "label": "Moral ambiguity", "score": 88},
        ],
        completed_at=timezone.now(),
    )

    timeline = client.get(reverse("analytics-consumption-timeline")).json()
    ratings = client.get(reverse("analytics-rating-distribution")).json()
    media_types = client.get(reverse("analytics-media-type-distribution")).json()
    dimensions = client.get(reverse("analytics-dimension-trends")).json()
    genericness_payload = client.get(reverse("analytics-genericness-satisfaction")).json()
    regret_payload = client.get(reverse("analytics-regret-time-cost")).json()
    creators = client.get(reverse("analytics-top-creators")).json()
    themes = client.get(reverse("analytics-top-themes")).json()
    overview = client.get(reverse("analytics-overview")).json()

    assert timeline["isEmpty"] is False
    assert [point["period"] for point in timeline["points"]] == ["2026-01", "2026-02"]
    assert timeline["points"][0]["completedCount"] == 1
    assert timeline["points"][1]["droppedCount"] == 1
    assert ratings["ratedCount"] == 3
    assert ratings["averageRating"] == 6.83
    assert sum(bucket["count"] for bucket in ratings["buckets"]) == 3
    assert media_types["totalCount"] == 3
    assert {row["mediaType"]: row["count"] for row in media_types["results"]} == {
        "movie": 1,
        "novel": 1,
        "tv_show": 1,
    }
    atmosphere_trend = next(
        row for row in dimensions["dimensions"] if row["dimensionSlug"] == "atmosphere"
    )
    assert atmosphere_trend["averageScore"] == 8.75
    assert atmosphere_trend["scoreCount"] == 2
    assert [point["title"] for point in genericness_payload["points"]] == [
        "Forgettable Filler",
        "Roadside Picnic",
        "Stalker",
    ]
    assert genericness_payload["averageGenericness"] == 4.67
    assert regret_payload["totalHighRegretMinutes"] == 135
    assert regret_payload["points"][0]["title"] == "Forgettable Filler"
    assert creators["results"][0]["creator"] == "Andrei Tarkovsky"
    assert all(row["creator"] != "Other Creator" for row in creators["results"])
    assert themes["results"][0]["label"] == "Atmosphere"
    assert overview["mediaTypeDistribution"]["totalCount"] == 3
    assert overview["topThemes"]["results"][0]["label"] == "Atmosphere"


def test_analytics_endpoints_appear_in_openapi_schema() -> None:
    response = APIClient().get(reverse("schema"))

    assert response.status_code == status.HTTP_200_OK
    content = response.content.decode()
    assert "/api/analytics/consumption-timeline/" in content
    assert "/api/analytics/top-themes/" in content
