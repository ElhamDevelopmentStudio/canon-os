from __future__ import annotations

import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from canonos.candidates.models import Candidate
from canonos.candidates.services import evaluate_candidate
from canonos.graph.models import GraphEdge, GraphNode
from canonos.graph.services import rebuild_taste_graph_for_user
from canonos.media.models import MediaItem
from canonos.narrative.models import NarrativeAnalysis
from canonos.narrative.services import request_narrative_analysis
from canonos.narrative.tasks import generate_narrative_analysis

pytestmark = pytest.mark.django_db


def create_user(email: str = "narrative@example.com") -> User:
    return User.objects.create_user(username=email, email=email, password="strong-password")


def authenticated_client(user: User | None = None) -> tuple[APIClient, User]:
    user = user or create_user()
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


def create_media(user: User, title: str = "Stalker") -> MediaItem:
    return MediaItem.objects.create(
        owner=user,
        title=title,
        media_type=MediaItem.MediaType.MOVIE,
        release_year=1979,
        creator="Andrei Tarkovsky",
        status=MediaItem.ConsumptionStatus.COMPLETED,
        personal_rating="9.5",
        notes="Patient atmosphere, spiritual theme, moral ambiguity, and a haunting ending.",
    )


def test_manual_analysis_generation_uses_notes_and_documents_source_basis() -> None:
    user = create_user()
    media = create_media(user)

    analysis = request_narrative_analysis(
        owner=user,
        media_item=media,
        manual_notes="Layered character agency, atmosphere, theme, and original imagery.",
        force_refresh=True,
    )

    assert analysis.status == NarrativeAnalysis.Status.COMPLETED
    assert analysis.character_complexity_score >= 60
    assert analysis.atmosphere_score >= 75
    assert analysis.thematic_weight_score >= 70
    assert analysis.confidence_score >= 55
    assert analysis.source_basis == NarrativeAnalysis.SourceBasis.MIXED_NOTES_METADATA
    assert "not full-source textual analysis" in analysis.analysis_summary
    assert "full copyrighted source text" in analysis.evidence_notes
    assert {event["status"] for event in analysis.status_events} == {
        "queued",
        "running",
        "completed",
    }


def test_analysis_request_and_detail_endpoints_are_owner_scoped() -> None:
    client, user = authenticated_client()
    media = create_media(user, "Mushishi")
    other = create_user("narrative-other@example.com")
    private_media = create_media(other, "Private")

    response = client.post(
        reverse("media-narrative-analysis", args=[media.id]),
        {"manualNotes": "Quiet atmosphere and episodic moral ambiguity.", "forceRefresh": True},
        format="json",
    )

    assert response.status_code == status.HTTP_201_CREATED
    payload = response.json()
    assert payload["mediaItemId"] == str(media.id)
    assert payload["status"] == "completed"
    assert payload["extractedTraits"]

    list_response = client.get(reverse("narrativeanalysis-list"), {"mediaItemId": str(media.id)})
    detail_response = client.get(reverse("narrativeanalysis-detail", args=[payload["id"]]))
    media_detail_response = client.get(reverse("media-narrative-analysis", args=[media.id]))
    private_response = client.post(
        reverse("media-narrative-analysis", args=[private_media.id]),
        {"manualNotes": "Should stay private."},
        format="json",
    )

    assert list_response.status_code == status.HTTP_200_OK
    assert list_response.json()["count"] == 1
    assert detail_response.status_code == status.HTTP_200_OK
    assert media_detail_response.status_code == status.HTTP_200_OK
    assert private_response.status_code == status.HTTP_404_NOT_FOUND


def test_analysis_status_transitions_and_celery_task_share_service() -> None:
    user = create_user("narrative-task@example.com")
    media = create_media(user, "Perfect Blue")
    analysis = NarrativeAnalysis.objects.create(owner=user, media_item=media)

    result = generate_narrative_analysis(str(analysis.id), "identity, pressure, atmosphere")

    analysis.refresh_from_db()
    assert result == {"id": str(analysis.id), "status": "completed"}
    assert analysis.status == NarrativeAnalysis.Status.COMPLETED
    assert [event["status"] for event in analysis.status_events] == [
        "queued",
        "running",
        "completed",
    ]


def test_candidate_evaluator_uses_narrative_dna_fields() -> None:
    user = create_user("narrative-candidate@example.com")
    media = create_media(user, "Atmospheric Favorite")
    request_narrative_analysis(
        owner=user,
        media_item=media,
        manual_notes="Atmosphere, memory, character agency, and thematic weight.",
        force_refresh=True,
    )
    candidate = Candidate.objects.create(
        owner=user,
        title="New Atmospheric Candidate",
        media_type=MediaItem.MediaType.MOVIE,
        premise="A haunting atmosphere-driven character study about memory and identity.",
        expected_genericness=2,
        expected_time_cost_minutes=100,
    )

    evaluation = evaluate_candidate(user, candidate)

    assert evaluation.narrative_signals
    assert any(signal["traitKey"] == "atmosphere" for signal in evaluation.narrative_signals)
    assert any("Narrative DNA" in reason for reason in evaluation.reasons_for)


def test_taste_graph_rebuild_uses_completed_narrative_dna_traits() -> None:
    user = create_user("narrative-graph@example.com")
    media = create_media(user, "Narrative Graph Work")
    request_narrative_analysis(
        owner=user,
        media_item=media,
        manual_notes="Atmosphere and theme are the point.",
        force_refresh=True,
    )

    result = rebuild_taste_graph_for_user(user)

    assert result.node_count >= 3
    assert GraphNode.objects.filter(
        owner=user,
        node_type=GraphNode.NodeType.NARRATIVE_TRAIT,
        label="Atmosphere",
    ).exists()
    assert GraphEdge.objects.filter(
        owner=user,
        edge_type=GraphEdge.EdgeType.NARRATIVE_SIGNAL,
    ).exists()


def test_narrative_endpoints_appear_in_openapi_schema() -> None:
    response = APIClient().get(reverse("schema"))

    assert response.status_code == status.HTTP_200_OK
    content = response.content.decode()
    assert "/api/narrative-analyses/" in content
    assert "/api/media-items/{media_id}/narrative-analysis/" in content
