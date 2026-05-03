from __future__ import annotations

import uuid

import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from canonos.graph.services import graph_rebuild_job_payload
from canonos.jobs.models import BackgroundJob
from canonos.jobs.services import upsert_background_job
from canonos.media.models import MediaItem
from canonos.metadata.models import ExternalMetadata
from canonos.metadata.providers import MovieTvPlaceholderProvider
from canonos.metadata.services import refresh_metadata_with_job
from canonos.narrative.services import request_narrative_analysis

pytestmark = pytest.mark.django_db


def create_user(email: str = "jobs@example.com") -> User:
    return User.objects.create_user(username=email, email=email, password="strong-password")


def authenticated_client(email: str = "jobs@example.com") -> tuple[APIClient, User]:
    user = create_user(email)
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


def test_upsert_background_job_tracks_terminal_completion() -> None:
    user = create_user()
    source_id = uuid.uuid4()

    queued = upsert_background_job(
        owner=user,
        job_type=BackgroundJob.JobType.EXPORT,
        source_id=source_id,
        source_label="Export backup",
        status=BackgroundJob.Status.PROCESSING,
        progress_total=10,
        progress_processed=2,
        progress_percent=20,
        message="Exporting records.",
    )
    completed = upsert_background_job(
        owner=user,
        job_type=BackgroundJob.JobType.EXPORT,
        source_id=source_id,
        source_label="Export backup",
        status=BackgroundJob.Status.COMPLETE,
        progress_total=10,
        progress_processed=10,
        progress_percent=100,
        message="Export ready.",
        result={"recordCount": 10},
    )

    assert completed.id == queued.id
    assert completed.completed_at is not None
    assert completed.result == {"recordCount": 10}


def test_jobs_list_and_detail_are_owner_scoped() -> None:
    client, user = authenticated_client("jobs-owner@example.com")
    other = create_user("jobs-other@example.com")
    visible = upsert_background_job(
        owner=user,
        job_type=BackgroundJob.JobType.IMPORT,
        source_id=uuid.uuid4(),
        source_label="Owner import",
        status=BackgroundJob.Status.COMPLETE,
        progress_total=1,
        progress_processed=1,
        progress_percent=100,
        message="Import complete.",
    )
    hidden = upsert_background_job(
        owner=other,
        job_type=BackgroundJob.JobType.EXPORT,
        source_id=uuid.uuid4(),
        source_label="Private export",
        status=BackgroundJob.Status.COMPLETE,
        progress_total=1,
        progress_processed=1,
        progress_percent=100,
        message="Export complete.",
    )

    list_response = client.get(reverse("background-job-list"))
    detail_response = client.get(reverse("background-job-detail", args=[visible.id]))
    private_response = client.get(reverse("background-job-detail", args=[hidden.id]))

    assert list_response.status_code == status.HTTP_200_OK
    payload = list_response.json()
    assert [job["id"] for job in payload] == [str(visible.id)]
    assert payload[0]["jobType"] == "import"
    assert payload[0]["progressPercent"] == 100
    assert detail_response.status_code == status.HTTP_200_OK
    assert detail_response.json()["sourceLabel"] == "Owner import"
    assert private_response.status_code == status.HTTP_404_NOT_FOUND


def test_job_endpoints_require_authentication() -> None:
    client = APIClient()

    response = client.get(reverse("background-job-list"))

    assert response.status_code in {status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN}


def test_graph_rebuild_creates_background_job() -> None:
    user = create_user("graph-job@example.com")
    MediaItem.objects.create(
        owner=user,
        title="Graph Job Movie",
        media_type="movie",
        status="completed",
        creator="Graph Creator",
        personal_rating="8.5",
    )

    payload = graph_rebuild_job_payload(user)
    job = BackgroundJob.objects.get(owner=user, id=payload["id"])

    assert payload["status"] == "completed"
    assert job.job_type == BackgroundJob.JobType.GRAPH_REBUILD
    assert job.status == BackgroundJob.Status.COMPLETE
    assert job.progress_percent == 100
    assert job.result["nodeCount"] == payload["nodeCount"]


def test_metadata_refresh_creates_background_job() -> None:
    user = create_user("metadata-job@example.com")
    media = MediaItem.objects.create(owner=user, title="Roadside Picnic", media_type="movie")
    match = MovieTvPlaceholderProvider().search("Roadside Picnic", "movie")[0]
    metadata = ExternalMetadata.objects.create(
        media_item=media,
        provider=match.provider,
        provider_item_id=match.provider_item_id,
        raw_payload=match.raw_payload,
        normalized_title=match.title,
        normalized_description=match.description,
        image_url=match.image_url,
        source_url=match.source_url,
    )

    refreshed, job = refresh_metadata_with_job(metadata)

    assert refreshed.raw_payload["refreshed"] is True
    assert job.job_type == BackgroundJob.JobType.METADATA_REFRESH
    assert job.status == BackgroundJob.Status.COMPLETE
    assert job.source_id == metadata.id
    assert job.result["metadataId"] == str(metadata.id)


def test_narrative_analysis_creates_background_job() -> None:
    user = create_user("narrative-job@example.com")
    media = MediaItem.objects.create(
        owner=user,
        title="Narrative Job Movie",
        media_type="movie",
        notes="Atmosphere, identity, moral ambiguity, and memory.",
    )

    analysis = request_narrative_analysis(owner=user, media_item=media, manual_notes=media.notes)
    job = BackgroundJob.objects.get(
        owner=user,
        job_type=BackgroundJob.JobType.NARRATIVE_ANALYSIS,
        source_id=analysis.id,
    )

    assert analysis.status == "completed"
    assert job.status == BackgroundJob.Status.COMPLETE
    assert job.progress_percent == 100
    assert job.result["analysisId"] == str(analysis.id)
