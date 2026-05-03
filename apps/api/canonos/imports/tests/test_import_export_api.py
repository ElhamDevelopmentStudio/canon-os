from __future__ import annotations

import json
from decimal import Decimal

import pytest
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from canonos.jobs.models import BackgroundJob
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
    assert BackgroundJob.objects.filter(
        owner=user,
        job_type=BackgroundJob.JobType.IMPORT,
        source_id=confirmed["id"],
        status=BackgroundJob.Status.COMPLETE,
    ).exists()
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
    assert BackgroundJob.objects.filter(
        owner=user,
        job_type=BackgroundJob.JobType.EXPORT,
        source_id=export_result["id"],
        status=BackgroundJob.Status.COMPLETE,
    ).exists()

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


def test_duplicate_import_detection_across_library_and_same_batch() -> None:
    client, user = authenticated_client("duplicates@example.com")
    existing = MediaItem.objects.create(
        owner=user, title="Existing Duplicate", media_type="movie", release_year=2003
    )
    csv_content = (
        "title,media_type,status,release_year\n"
        "Existing Duplicate,movie,planned,2003\n"
        "New Duplicate,movie,planned,2004\n"
        "New Duplicate,movie,planned,2004\n"
    )

    response = client.post(
        reverse("import-preview"),
        {"sourceType": "csv", "content": csv_content},
        format="json",
    )
    payload = response.json()

    assert response.status_code == status.HTTP_201_CREATED
    assert payload["validCount"] == 1
    assert payload["duplicateCount"] == 2
    existing_duplicate, first_new, repeated_new = payload["items"]
    assert existing_duplicate["status"] == "duplicate"
    assert existing_duplicate["duplicateOfMediaItemId"] == str(existing.id)
    assert first_new["status"] == "valid"
    assert repeated_new["status"] == "duplicate"
    assert "Duplicate of row 3" in repeated_new["warnings"][0]


def test_import_rollback_removes_created_records_and_is_idempotence_guarded() -> None:
    client, user = authenticated_client("rollback@example.com")
    csv_content = "title,media_type,status\nRollback Movie,movie,planned\n"
    preview_response = client.post(
        reverse("import-preview"),
        {"sourceType": "csv", "content": csv_content},
        format="json",
    )
    batch_id = preview_response.json()["id"]
    confirm_response = client.post(reverse("import-confirm", args=[batch_id]))

    assert confirm_response.status_code == status.HTTP_200_OK
    assert MediaItem.objects.filter(owner=user, title="Rollback Movie").exists()

    rollback_response = client.post(reverse("import-rollback", args=[batch_id]))
    rollback_payload = rollback_response.json()

    assert rollback_response.status_code == status.HTTP_200_OK
    assert rollback_payload["removedCount"] == 1
    assert rollback_payload["mediaItemsRemoved"] == 1
    assert rollback_payload["batch"]["status"] == "rolled_back"
    assert rollback_payload["batch"]["rollbackItemCount"] == 1
    assert (
        BackgroundJob.objects.get(
            owner=user,
            job_type=BackgroundJob.JobType.IMPORT,
            source_id=batch_id,
        ).status
        == BackgroundJob.Status.ROLLED_BACK
    )
    assert not MediaItem.objects.filter(owner=user, title="Rollback Movie").exists()

    second_response = client.post(reverse("import-rollback", args=[batch_id]))

    assert second_response.status_code == status.HTTP_400_BAD_REQUEST


def test_large_import_tracks_progress_for_500_media_items() -> None:
    client, user = authenticated_client("large-import@example.com")
    rows = ["title,media_type,status,release_year"]
    rows.extend(f"Large Import {index},movie,planned,{2000 + (index % 20)}" for index in range(500))
    preview_response = client.post(
        reverse("import-preview"),
        {"sourceType": "csv", "content": "\n".join(rows)},
        format="json",
    )
    preview = preview_response.json()

    assert preview_response.status_code == status.HTTP_201_CREATED
    assert preview["validCount"] == 500
    assert preview["progressTotal"] == 500
    assert preview["progressPercent"] == 0

    confirm_response = client.post(reverse("import-confirm", args=[preview["id"]]))
    confirmed = confirm_response.json()

    assert confirm_response.status_code == status.HTTP_200_OK
    assert confirmed["createdCount"] == 500
    assert confirmed["progressTotal"] == 500
    assert confirmed["progressProcessed"] == 500
    assert confirmed["progressPercent"] == 100
    assert MediaItem.objects.filter(owner=user, title__startswith="Large Import ").count() == 500


def test_export_restore_dry_run_reports_counts_and_duplicate_warnings() -> None:
    client, user = authenticated_client("restore@example.com")
    MediaItem.objects.create(owner=user, title="Restore Duplicate", media_type="movie")
    document = {
        "version": "canonos.export.v1",
        "data": {
            "mediaItems": [
                {"title": "Restore Duplicate", "mediaType": "movie", "status": "planned"},
                {"title": "Restore New", "mediaType": "anime", "status": "completed"},
            ],
            "candidates": [
                {"title": "Restore Candidate", "mediaType": "movie", "status": "unevaluated"}
            ],
            "queueItems": [{"title": "Restore Queue", "mediaType": "novel"}],
        },
    }

    response = client.post(
        reverse("export-restore-dry-run"),
        {"content": json.dumps(document)},
        format="json",
    )
    payload = response.json()

    assert response.status_code == status.HTTP_200_OK
    assert payload["isValid"] is True
    assert payload["totalCount"] == 4
    assert payload["validCount"] == 3
    assert payload["duplicateCount"] == 1
    assert payload["countsByKind"]["media"] == 2
    assert payload["countsByKind"]["candidate"] == 1
    assert payload["countsByKind"]["queue"] == 1


def test_import_rejects_wrong_file_type_and_oversized_content() -> None:
    client, _ = authenticated_client("invalid-file@example.com")

    wrong_type = client.post(
        reverse("import-preview"),
        {
            "sourceType": "csv",
            "file": SimpleUploadedFile(
                "not-a-csv.txt", b"title,media_type\nWrong,movie\n", content_type="text/plain"
            ),
        },
        format="multipart",
    )
    oversized = client.post(
        reverse("import-preview"),
        {"sourceType": "json", "content": "x" * ((2 * 1024 * 1024) + 1)},
        format="json",
    )

    assert wrong_type.status_code == status.HTTP_400_BAD_REQUEST
    assert ".csv" in wrong_type.json()["detail"]
    assert oversized.status_code == status.HTTP_400_BAD_REQUEST
    assert "2 MB or smaller" in oversized.json()["detail"]
