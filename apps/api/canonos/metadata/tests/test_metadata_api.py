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
    MovieTvProvider,
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


def test_metadata_provider_capabilities_hide_secrets() -> None:
    client, _ = authenticated_client()

    response = client.get(reverse("metadata-providers"))

    assert response.status_code == status.HTTP_200_OK
    payload = response.json()
    assert payload["count"] == 4
    movie_provider = next(
        provider for provider in payload["results"] if provider["provider"] == "movie_tv"
    )
    assert movie_provider["lookupSupported"] is True
    assert movie_provider["accountImportSupported"] is False
    assert "TMDb" in movie_provider["notes"]
    assert "secret" not in str(payload).lower()


def test_tmdb_adapter_normalizes_movie_results(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CANONOS_METADATA_ENABLE_NETWORK", "true")
    monkeypatch.setenv("TMDB_READ_ACCESS_TOKEN", "test-token")

    def fake_request(url: str, **kwargs: object) -> dict[str, object]:
        assert "api_key" not in url
        headers = kwargs["headers"]
        assert isinstance(headers, dict)
        assert headers["Authorization"] == "Bearer test-token"
        return {
            "results": [
                {
                    "id": 1396,
                    "title": "Stalker",
                    "original_title": "Stalker",
                    "overview": "A guide leads two men into the Zone.",
                    "release_date": "1979-05-25",
                    "poster_path": "/stalker.jpg",
                    "vote_average": 8.1,
                    "popularity": 64.3,
                }
            ]
        }

    monkeypatch.setattr("canonos.metadata.providers._json_request", fake_request)

    match = MovieTvProvider().search("Stalker", "movie")[0]

    assert match.provider == "movie_tv"
    assert match.provider_item_id == "tmdb:movie:1396"
    assert match.title == "Stalker"
    assert match.media_type == "movie"
    assert match.release_year == 1979
    assert match.image_url == "https://image.tmdb.org/t/p/w500/stalker.jpg"
    assert match.raw_payload["sourceProvider"] == "tmdb"


def test_omdb_adapter_is_lookup_only_fallback(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CANONOS_METADATA_ENABLE_NETWORK", "true")
    monkeypatch.delenv("TMDB_READ_ACCESS_TOKEN", raising=False)
    monkeypatch.delenv("TMDB_API_KEY", raising=False)
    monkeypatch.setenv("OMDB_API_KEY", "omdb-key")

    def fake_request(url: str, **kwargs: object) -> dict[str, object]:  # noqa: ARG001
        assert "apikey=omdb-key" in url
        return {
            "Response": "True",
            "Search": [
                {
                    "Title": "The Wire",
                    "Year": "2002",
                    "imdbID": "tt0306414",
                    "Type": "series",
                    "Poster": "https://example.test/wire.jpg",
                }
            ],
        }

    monkeypatch.setattr("canonos.metadata.providers._json_request", fake_request)

    match = MovieTvProvider().search("The Wire", "tv_show")[0]

    assert match.provider_item_id == "omdb:tt0306414"
    assert match.media_type == "tv_show"
    assert match.raw_payload["sourceProvider"] == "omdb"
    assert match.raw_payload["accountImport"] is False


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
