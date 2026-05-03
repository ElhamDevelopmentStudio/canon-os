from __future__ import annotations

import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from canonos.discovery.models import DiscoveryTrail
from canonos.discovery.services import (
    DiscoverySearch,
    detect_underexplored_media_types,
    generate_discovery_trail,
)
from canonos.media.models import MediaItem

pytestmark = pytest.mark.django_db


def create_user(email: str = "discovery@example.com") -> User:
    return User.objects.create_user(username=email, email=email, password="strong-password")


def authenticated_client(user: User | None = None) -> tuple[APIClient, User]:
    user = user or create_user()
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


def test_underexplored_media_type_detection_prefers_lightly_logged_mediums() -> None:
    user = create_user()
    MediaItem.objects.create(
        owner=user,
        title="Known Movie A",
        media_type="movie",
        status="completed",
        personal_rating="9.0",
    )
    MediaItem.objects.create(
        owner=user,
        title="Known Movie B",
        media_type="movie",
        status="completed",
        personal_rating="8.0",
    )
    MediaItem.objects.create(owner=user, title="Known Anime", media_type="anime", status="planned")

    underexplored = detect_underexplored_media_types(user)

    assert "novel" in underexplored
    assert "audiobook" in underexplored
    assert "movie" not in underexplored


def test_generate_discovery_trail_excludes_known_titles_and_explains_expansion() -> None:
    client, user = authenticated_client()
    MediaItem.objects.create(
        owner=user,
        title="Woman in the Dunes",
        media_type="movie",
        status="completed",
        personal_rating="9.5",
        country_language="Japan / Japanese",
    )

    response = client.post(
        reverse("discovery-generate"),
        {"theme": "identity", "mood": "patient and uncanny", "mode": "deep_cut"},
        format="json",
    )

    assert response.status_code == status.HTTP_200_OK
    payload = response.json()
    assert payload["results"]
    assert all(result["title"] != "Woman in the Dunes" for result in payload["results"])
    assert payload["draft"]["name"].startswith("Deep Cut:")
    first = payload["results"][0]
    assert first["expansionRationale"]
    assert first["riskRationale"]
    assert any(reason["kind"] == "taste_expansion" for reason in first["reasons"])


def test_generate_discovery_trail_respects_media_type_filter() -> None:
    client, _ = authenticated_client()

    response = client.post(
        reverse("discovery-generate"),
        {"mediaType": "novel", "theme": "memory", "era": "pre_1970"},
        format="json",
    )

    assert response.status_code == status.HTTP_200_OK
    payload = response.json()
    assert payload["results"]
    assert {result["mediaType"] for result in payload["results"]} == {"novel"}
    assert payload["search"]["mediaType"] == "novel"


def test_save_list_and_retrieve_discovery_trail_are_owner_scoped() -> None:
    client, user = authenticated_client()
    generated = generate_discovery_trail(user, search=DiscoverySearch(theme="memory"))

    response = client.post(reverse("discoverytrail-list"), generated["draft"], format="json")

    assert response.status_code == status.HTTP_201_CREATED
    payload = response.json()
    assert payload["name"] == generated["draft"]["name"]
    assert payload["resultItems"]
    assert DiscoveryTrail.objects.filter(owner=user, name=payload["name"]).count() == 1

    list_response = client.get(reverse("discoverytrail-list"))
    detail_response = client.get(reverse("discoverytrail-detail", args=[payload["id"]]))

    assert list_response.status_code == status.HTTP_200_OK
    assert list_response.json()["results"][0]["id"] == payload["id"]
    assert detail_response.status_code == status.HTTP_200_OK
    assert detail_response.json()["resultItems"][0]["title"] == payload["resultItems"][0]["title"]

    other_client, _ = authenticated_client(create_user("other-discovery@example.com"))
    assert other_client.get(reverse("discoverytrail-list")).json()["count"] == 0
    assert (
        other_client.get(reverse("discoverytrail-detail", args=[payload["id"]])).status_code
        == status.HTTP_404_NOT_FOUND
    )


def test_discovery_endpoints_appear_in_openapi_schema() -> None:
    response = APIClient().get(reverse("schema"))

    assert response.status_code == status.HTTP_200_OK
    content = response.content.decode()
    assert "/api/discovery/generate/" in content
    assert "/api/discovery/trails/" in content
