from __future__ import annotations

import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from canonos.media.models import MediaItem

pytestmark = pytest.mark.django_db


def create_user(email: str = "reader@example.com") -> User:
    return User.objects.create_user(username=email, email=email, password="strong-password")


def media_payload(**overrides):  # noqa: ANN003, ANN201
    payload = {
        "title": "Stalker",
        "originalTitle": "Сталкер",
        "mediaType": "movie",
        "releaseYear": 1979,
        "countryLanguage": "Soviet Union / Russian",
        "creator": "Andrei Tarkovsky",
        "status": "completed",
        "personalRating": "9.5",
        "startedDate": "2026-01-02",
        "completedDate": "2026-01-02",
        "runtimeMinutes": 162,
        "episodeCount": None,
        "pageCount": None,
        "audiobookLengthMinutes": None,
        "notes": "Dense, patient, and atmospheric.",
    }
    payload.update(overrides)
    return payload


def authenticated_client(user: User | None = None) -> tuple[APIClient, User]:
    user = user or create_user()
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


def test_create_media_item_assigns_owner() -> None:
    client, user = authenticated_client()

    response = client.post(reverse("mediaitem-list"), media_payload(), format="json")

    assert response.status_code == status.HTTP_201_CREATED
    payload = response.json()
    assert payload["title"] == "Stalker"
    assert payload["mediaType"] == "movie"
    assert payload["status"] == "completed"
    assert MediaItem.objects.get(id=payload["id"]).owner == user


def test_list_media_items_filters_searches_and_orders_by_updated_date() -> None:
    client, user = authenticated_client()
    MediaItem.objects.create(
        owner=user,
        title="Stalker",
        media_type="movie",
        status="completed",
        creator="Andrei Tarkovsky",
    )
    MediaItem.objects.create(
        owner=user,
        title="Mushishi",
        media_type="anime",
        status="planned",
        creator="Yuki Urushibara",
    )

    response = client.get(reverse("mediaitem-list"), {"mediaType": "anime", "search": "mushi"})

    assert response.status_code == status.HTTP_200_OK
    payload = response.json()
    assert payload["count"] == 1
    assert payload["results"][0]["title"] == "Mushishi"


def test_update_media_item() -> None:
    client, user = authenticated_client()
    item = MediaItem.objects.create(
        owner=user,
        title="Old title",
        media_type="novel",
        status="planned",
    )

    response = client.patch(
        reverse("mediaitem-detail", args=[item.id]),
        {"title": "Roadside Picnic", "status": "completed", "personalRating": "9.0"},
        format="json",
    )

    assert response.status_code == status.HTTP_200_OK
    item.refresh_from_db()
    assert item.title == "Roadside Picnic"
    assert item.status == "completed"
    assert item.personal_rating == 9


def test_delete_media_item() -> None:
    client, user = authenticated_client()
    item = MediaItem.objects.create(
        owner=user,
        title="Delete me",
        media_type="movie",
        status="planned",
    )

    response = client.delete(reverse("mediaitem-detail", args=[item.id]))

    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert not MediaItem.objects.filter(id=item.id).exists()


def test_users_cannot_see_or_modify_other_users_items() -> None:
    owner = create_user("owner@example.com")
    other = create_user("other@example.com")
    item = MediaItem.objects.create(
        owner=owner,
        title="Private item",
        media_type="movie",
        status="planned",
    )
    client, _ = authenticated_client(other)

    list_response = client.get(reverse("mediaitem-list"))
    detail_response = client.get(reverse("mediaitem-detail", args=[item.id]))
    patch_response = client.patch(reverse("mediaitem-detail", args=[item.id]), {"title": "Leaked"})
    delete_response = client.delete(reverse("mediaitem-detail", args=[item.id]))

    assert list_response.status_code == status.HTTP_200_OK
    assert list_response.json()["count"] == 0
    assert detail_response.status_code == status.HTTP_404_NOT_FOUND
    assert patch_response.status_code == status.HTTP_404_NOT_FOUND
    assert delete_response.status_code == status.HTTP_404_NOT_FOUND
    assert MediaItem.objects.filter(id=item.id, title="Private item").exists()


def test_media_endpoints_appear_in_openapi_schema() -> None:
    response = APIClient().get(reverse("schema"))

    assert response.status_code == status.HTTP_200_OK
    content = response.content.decode()
    assert "/api/media-items/" in content
    assert "/api/media-items/{id}/" in content


def test_list_media_items_supports_advanced_filters() -> None:
    from canonos.taste.models import MediaScore, TasteDimension

    client, user = authenticated_client()
    genericness = TasteDimension.objects.create(
        owner=user,
        slug="genericness",
        name="Genericness",
        direction="negative",
    )
    regret = TasteDimension.objects.create(
        owner=user,
        slug="regret_score",
        name="Regret score",
        direction="negative",
    )
    match = MediaItem.objects.create(
        owner=user,
        title="Precise Match",
        media_type="movie",
        status="completed",
        creator="Filter Auteur",
        personal_rating="8.6",
        completed_date="2026-02-10",
    )
    MediaScore.objects.create(media_item=match, taste_dimension=genericness, score="2.0")
    MediaScore.objects.create(media_item=match, taste_dimension=regret, score="1.5")
    mismatch = MediaItem.objects.create(
        owner=user,
        title="Risky Mismatch",
        media_type="movie",
        status="completed",
        creator="Filter Auteur",
        personal_rating="8.8",
        completed_date="2026-02-11",
    )
    MediaScore.objects.create(media_item=mismatch, taste_dimension=genericness, score="8.0")
    MediaScore.objects.create(media_item=mismatch, taste_dimension=regret, score="7.0")

    response = client.get(
        reverse("mediaitem-list"),
        {
            "creator": "auteur",
            "ratingMin": "8",
            "ratingMax": "9",
            "genericnessMax": "3",
            "regretMax": "2",
            "completedFrom": "2026-02-01",
            "completedTo": "2026-02-28",
        },
    )

    assert response.status_code == status.HTTP_200_OK
    payload = response.json()
    assert payload["count"] == 1
    assert payload["results"][0]["id"] == str(match.id)
