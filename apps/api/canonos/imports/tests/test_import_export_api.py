from __future__ import annotations

import json
from decimal import Decimal

import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from canonos.media.models import MediaItem
from canonos.taste.models import MediaScore, TasteDimension
from canonos.taste.services import seed_default_taste_dimensions

pytestmark = pytest.mark.django_db


def authenticated_client(email: str = "reader@example.com") -> tuple[APIClient, User]:
    user = User.objects.create_user(username=email, email=email, password="strong-password")
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


def test_valid_csv_import_preview_and_confirm_creates_media_and_scores() -> None:
    client, user = authenticated_client()
    seed_default_taste_dimensions(user)
    atmosphere = TasteDimension.objects.get(owner=user, slug="atmosphere")
    csv_content = (
        "title,media_type,status,personal_rating,release_year,creator,score_atmosphere\n"
        "Imported Movie,movie,completed,9.1,2001,Import Director,8.5\n"
    )

    preview_response = client.post(
        reverse("import-preview"),
        {"sourceType": "csv", "content": csv_content},
        format="json",
    )

    assert preview_response.status_code == status.HTTP_201_CREATED
    preview = preview_response.json()
    assert preview["validCount"] == 1
    assert preview["invalidCount"] == 0
    assert preview["items"][0]["title"] == "Imported Movie"
    assert MediaItem.objects.filter(owner=user).count() == 0

    confirm_response = client.post(reverse("import-confirm", args=[preview["id"]]))

    assert confirm_response.status_code == status.HTTP_200_OK
    confirmed = confirm_response.json()
    assert confirmed["status"] == "confirmed"
    assert confirmed["createdCount"] == 1
    media_item = MediaItem.objects.get(owner=user, title="Imported Movie")
    assert media_item.personal_rating == Decimal("9.1")
    assert MediaScore.objects.get(
        media_item=media_item, taste_dimension=atmosphere
    ).score == Decimal("8.5")


def test_invalid_import_preserves_existing_records_and_cannot_confirm() -> None:
    client, user = authenticated_client()
    existing = MediaItem.objects.create(owner=user, title="Existing", media_type="movie")
    csv_content = "title,media_type,status\n,unknown,completed\n"

    preview_response = client.post(
        reverse("import-preview"),
        {"sourceType": "csv", "content": csv_content},
        format="json",
    )
    preview = preview_response.json()

    assert preview_response.status_code == status.HTTP_201_CREATED
    assert preview["invalidCount"] == 1
    assert preview["items"][0]["errors"]

    confirm_response = client.post(reverse("import-confirm", args=[preview["id"]]))

    assert confirm_response.status_code == status.HTTP_400_BAD_REQUEST
    assert list(MediaItem.objects.filter(owner=user).values_list("id", flat=True)) == [existing.id]


def test_json_export_contains_user_owned_media_scores_and_settings() -> None:
    client, user = authenticated_client()
    seed_default_taste_dimensions(user)
    dimension = TasteDimension.objects.get(owner=user, slug="atmosphere")
    media_item = MediaItem.objects.create(
        owner=user,
        title="Exported Movie",
        media_type="movie",
        status="completed",
        personal_rating="8.8",
    )
    MediaScore.objects.create(media_item=media_item, taste_dimension=dimension, score="9.0")

    export_response = client.post(reverse("export-request"), {"format": "json"}, format="json")

    assert export_response.status_code == status.HTTP_201_CREATED
    export_result = export_response.json()
    assert export_result["format"] == "json"
    assert export_result["recordCount"] == 1

    download_response = client.get(reverse("export-download", args=[export_result["id"]]))
    payload = json.loads(download_response.content.decode())

    assert download_response.status_code == status.HTTP_200_OK
    assert payload["version"] == "canonos.export.v1"
    assert payload["data"]["mediaItems"][0]["title"] == "Exported Movie"
    assert payload["data"]["mediaItems"][0]["scores"][0]["dimensionSlug"] == "atmosphere"
    assert payload["data"]["settings"]["defaultRiskTolerance"] == "medium"


def test_exported_json_can_be_imported_into_fresh_user() -> None:
    source_client, source_user = authenticated_client("source@example.com")
    seed_default_taste_dimensions(source_user)
    media_item = MediaItem.objects.create(
        owner=source_user,
        title="Portable Movie",
        media_type="anime",
        status="completed",
        personal_rating="9.4",
    )
    dimension = TasteDimension.objects.get(owner=source_user, slug="atmosphere")
    MediaScore.objects.create(media_item=media_item, taste_dimension=dimension, score="8.5")
    export_response = source_client.post(
        reverse("export-request"), {"format": "json"}, format="json"
    )
    exported = source_client.get(
        reverse("export-download", args=[export_response.json()["id"]])
    ).content.decode()

    fresh_client, fresh_user = authenticated_client("fresh@example.com")
    preview_response = fresh_client.post(
        reverse("import-preview"),
        {"sourceType": "json", "content": exported},
        format="json",
    )
    preview = preview_response.json()

    assert preview_response.status_code == status.HTTP_201_CREATED
    assert preview["validCount"] == 1

    confirm_response = fresh_client.post(reverse("import-confirm", args=[preview["id"]]))

    assert confirm_response.status_code == status.HTTP_200_OK
    imported = MediaItem.objects.get(owner=fresh_user, title="Portable Movie")
    assert imported.media_type == "anime"
    assert imported.personal_rating == Decimal("9.4")
    assert imported.scores.get(taste_dimension__slug="atmosphere").score == Decimal("8.5")


def test_csv_export_downloads_library_and_rating_columns() -> None:
    client, user = authenticated_client()
    seed_default_taste_dimensions(user)
    MediaItem.objects.create(owner=user, title="CSV Movie", media_type="movie", status="planned")

    export_response = client.post(reverse("export-request"), {"format": "csv"}, format="json")
    export_result = export_response.json()
    download_response = client.get(reverse("export-download", args=[export_result["id"]]))
    content = download_response.content.decode()

    assert export_response.status_code == status.HTTP_201_CREATED
    assert download_response.status_code == status.HTTP_200_OK
    assert "title,media_type,status,personal_rating" in content
    assert "score_atmosphere" in content
    assert "CSV Movie" in content


def test_import_confirm_and_export_download_are_owner_scoped() -> None:
    owner_client, _ = authenticated_client("portable-owner@example.com")
    other_client, _ = authenticated_client("portable-other@example.com")
    preview_response = owner_client.post(
        reverse("import-preview"),
        {
            "sourceType": "csv",
            "content": "title,media_type,status\nPrivate Import,movie,planned\n",
        },
        format="json",
    )
    export_response = owner_client.post(
        reverse("export-request"), {"format": "json"}, format="json"
    )

    confirm_response = other_client.post(
        reverse("import-confirm", args=[preview_response.json()["id"]])
    )
    download_response = other_client.get(
        reverse("export-download", args=[export_response.json()["id"]])
    )

    assert preview_response.status_code == status.HTTP_201_CREATED
    assert export_response.status_code == status.HTTP_201_CREATED
    assert confirm_response.status_code == status.HTTP_404_NOT_FOUND
    assert download_response.status_code == status.HTTP_404_NOT_FOUND
    assert not MediaItem.objects.filter(title="Private Import").exists()
