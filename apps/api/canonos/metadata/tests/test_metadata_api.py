from __future__ import annotations

import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from canonos.media.models import MediaItem
from canonos.metadata.models import ExternalMetadata
from canonos.metadata.providers import (
    MovieTvPlaceholderProvider,
    get_provider,
    providers_for_media_type,
)
from canonos.metadata.tasks import refresh_external_metadata

pytestmark = pytest.mark.django_db


def create_user(email: str = "metadata@example.com") -> User:
    return User.objects.create_user(username=email, email=email, password="strong-password")


def authenticated_client(user: User | None = None) -> tuple[APIClient, User]:
    user = user or create_user()
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


def create_media_item(user: User, title: str = "Metadata Work") -> MediaItem:
    return MediaItem.objects.create(owner=user, title=title, media_type="movie", status="planned")


def test_provider_adapter_interface_returns_normalized_matches() -> None:
    provider = MovieTvPlaceholderProvider()

    matches = provider.search("Stalker", "movie")
    details = provider.fetch_details(matches[0].provider_item_id)

    assert provider.provider_name == ExternalMetadata.ExternalProvider.MOVIE_TV
    assert matches[0].provider == "movie_tv"
    assert matches[0].title == "Stalker"
    assert matches[0].raw_payload["placeholder"] is True
    assert details.provider_item_id == matches[0].provider_item_id
    assert get_provider("movie_tv").provider_name == "movie_tv"
    assert providers_for_media_type("anime")[0].provider_name == "anime"


def test_metadata_match_endpoint_filters_by_media_type() -> None:
    client, _ = authenticated_client()

    response = client.get(reverse("metadata-matches"), {"query": "Mushishi", "mediaType": "anime"})

    assert response.status_code == status.HTTP_200_OK
    payload = response.json()
    assert payload["count"] == 1
    assert payload["results"][0]["provider"] == "anime"
    assert payload["results"][0]["title"] == "Mushishi"


def test_attach_metadata_to_owned_media_item() -> None:
    client, user = authenticated_client()
    item = create_media_item(user, "Stalker")
    match = client.get(
        reverse("metadata-matches"),
        {"query": "Stalker", "mediaType": "movie"},
    ).json()["results"][0]

    response = client.post(reverse("media-metadata-attach", args=[item.id]), match, format="json")

    assert response.status_code == status.HTTP_201_CREATED
    payload = response.json()
    assert payload["mediaItemId"] == str(item.id)
    assert payload["provider"] == "movie_tv"
    assert payload["normalizedTitle"] == "Stalker"
    assert ExternalMetadata.objects.filter(media_item=item, provider="movie_tv").exists()


def test_users_cannot_attach_metadata_to_other_users_media() -> None:
    owner = create_user("owner-metadata@example.com")
    other = create_user("other-metadata@example.com")
    item = create_media_item(owner, "Private Metadata")
    client, _ = authenticated_client(other)
    match = MovieTvPlaceholderProvider().search("Private Metadata", "movie")[0]

    response = client.post(
        reverse("media-metadata-attach", args=[item.id]),
        {
            "provider": match.provider,
            "providerItemId": match.provider_item_id,
            "mediaType": match.media_type,
            "title": match.title,
            "rawPayload": match.raw_payload,
        },
        format="json",
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert not ExternalMetadata.objects.filter(media_item=item).exists()


def test_refresh_metadata_endpoint_and_task_update_snapshot() -> None:
    client, user = authenticated_client()
    item = create_media_item(user, "Roadside Picnic")
    match = MovieTvPlaceholderProvider().search("Roadside Picnic", "movie")[0]
    metadata = ExternalMetadata.objects.create(
        media_item=item,
        provider=match.provider,
        provider_item_id=match.provider_item_id,
        raw_payload=match.raw_payload,
        normalized_title=match.title,
        normalized_description=match.description,
        image_url=match.image_url,
        source_url=match.source_url,
    )

    task_result = refresh_external_metadata(str(metadata.id))
    metadata.refresh_from_db()
    response = client.post(reverse("media-metadata-refresh", args=[item.id]), format="json")

    assert task_result == str(metadata.id)
    assert response.status_code == status.HTTP_201_CREATED
    payload = response.json()
    assert payload["status"] == "succeeded"
    assert payload["metadata"]["id"] == str(metadata.id)
    assert payload["metadata"]["rawPayload"]["refreshed"] is True
