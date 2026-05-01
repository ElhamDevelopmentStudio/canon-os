from __future__ import annotations

import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from canonos.media.models import MediaItem
from canonos.taste.defaults import DEFAULT_TASTE_DIMENSIONS
from canonos.taste.models import MediaScore, TasteDimension
from canonos.taste.services import seed_default_taste_dimensions

pytestmark = pytest.mark.django_db


def create_user(email: str = "taste@example.com") -> User:
    return User.objects.create_user(username=email, email=email, password="strong-password")


def authenticated_client(user: User | None = None) -> tuple[APIClient, User]:
    user = user or create_user()
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


def test_default_dimensions_created_for_registered_user() -> None:
    client = APIClient()

    response = client.post(
        reverse("auth-register"),
        {
            "email": "reader@example.com",
            "password": "strong-password",
            "displayName": "Canon Reader",
        },
        format="json",
    )

    assert response.status_code == status.HTTP_201_CREATED
    user = User.objects.get(email="reader@example.com")
    assert TasteDimension.objects.filter(owner=user, is_default=True).count() == len(
        DEFAULT_TASTE_DIMENSIONS
    )
    assert TasteDimension.objects.filter(owner=user, slug="story_depth").exists()
    assert TasteDimension.objects.filter(
        owner=user,
        slug="regret_score",
        direction="negative",
    ).exists()


def test_dimensions_list_seeds_and_returns_defaults() -> None:
    client, user = authenticated_client()

    response = client.get(reverse("taste-dimension-list"))

    assert response.status_code == status.HTTP_200_OK
    payload = response.json()
    assert len(payload) == len(DEFAULT_TASTE_DIMENSIONS)
    assert TasteDimension.objects.filter(owner=user).count() == len(DEFAULT_TASTE_DIMENSIONS)
    assert {item["slug"] for item in payload} >= {"story_depth", "genericness", "regret_score"}


def test_bulk_score_update_and_media_detail_response() -> None:
    client, user = authenticated_client()
    dimensions = seed_default_taste_dimensions(user)
    media = MediaItem.objects.create(
        owner=user,
        title="Mushishi",
        media_type="anime",
        status="completed",
    )
    story = next(dimension for dimension in dimensions if dimension.slug == "story_depth")
    regret = next(dimension for dimension in dimensions if dimension.slug == "regret_score")

    response = client.put(
        reverse("media-score-list", args=[media.id]),
        {
            "scores": [
                {"dimensionId": str(story.id), "score": "9.0", "note": "Quietly layered."},
                {"dimensionId": str(regret.id), "score": "0.0", "note": "No regret."},
            ]
        },
        format="json",
    )

    assert response.status_code == status.HTTP_200_OK
    payload = response.json()
    assert len(payload["results"]) == 2
    assert MediaScore.objects.filter(media_item=media).count() == 2

    detail_response = client.get(reverse("mediaitem-detail", args=[media.id]))
    assert detail_response.status_code == status.HTTP_200_OK
    detail_payload = detail_response.json()
    assert {score["dimensionSlug"] for score in detail_payload["scores"]} == {
        "story_depth",
        "regret_score",
    }


def test_score_values_cannot_exceed_range() -> None:
    client, user = authenticated_client()
    dimensions = seed_default_taste_dimensions(user)
    media = MediaItem.objects.create(
        owner=user,
        title="Roadside Picnic",
        media_type="novel",
        status="completed",
    )

    response = client.put(
        reverse("media-score-list", args=[media.id]),
        {"scores": [{"dimensionId": str(dimensions[0].id), "score": "10.1"}]},
        format="json",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert MediaScore.objects.count() == 0


def test_users_cannot_score_other_users_media_or_dimensions() -> None:
    owner = create_user("owner@example.com")
    other = create_user("other@example.com")
    media = MediaItem.objects.create(
        owner=owner,
        title="Private",
        media_type="movie",
        status="completed",
    )
    owner_dimension = seed_default_taste_dimensions(owner)[0]
    client, _ = authenticated_client(other)

    response = client.put(
        reverse("media-score-list", args=[media.id]),
        {"scores": [{"dimensionId": str(owner_dimension.id), "score": "7.0"}]},
        format="json",
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert MediaScore.objects.count() == 0


def test_taste_endpoints_appear_in_openapi_schema() -> None:
    response = APIClient().get(reverse("schema"))

    assert response.status_code == status.HTTP_200_OK
    content = response.content.decode()
    assert "/api/taste-dimensions/" in content
    assert "/api/media-items/{media_id}/scores/" in content
