from __future__ import annotations

import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from canonos.candidates.models import Candidate
from canonos.council.models import CriticPersona
from canonos.council.services import (
    apply_council_decision,
    get_personas_for_user,
    run_council_session,
)
from canonos.media.models import MediaItem

pytestmark = pytest.mark.django_db


def create_user(email: str = "council@example.com") -> User:
    return User.objects.create_user(username=email, email=email, password="strong-password")


def authenticated_client(user: User | None = None) -> tuple[APIClient, User]:
    user = user or create_user()
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


def create_candidate(user: User, title: str = "A Modern Exception") -> Candidate:
    return Candidate.objects.create(
        owner=user,
        title=title,
        media_type=MediaItem.MediaType.MOVIE,
        release_year=2024,
        known_creator="Distinctive Auteur",
        premise=(
            "A modern atmospheric character study with original craft, moral ambiguity, "
            "and a clear authorial voice."
        ),
        source_of_interest="Niche festival signal",
        hype_level=4,
        expected_genericness=2,
        expected_time_cost_minutes=105,
    )


def create_media(user: User, title: str = "Council Media") -> MediaItem:
    return MediaItem.objects.create(
        owner=user,
        title=title,
        media_type=MediaItem.MediaType.ANIME,
        release_year=1998,
        creator="Original Studio",
        status=MediaItem.ConsumptionStatus.PLANNED,
        notes="Dense atmosphere, strong source questions, and possible pacing risks.",
    )


def test_default_personas_are_seeded_and_owner_scoped() -> None:
    user = create_user()
    other = create_user("council-other@example.com")

    personas = get_personas_for_user(user)
    get_personas_for_user(other)

    assert personas.count() == 8
    assert {persona.role for persona in personas} == {
        CriticPersona.Role.RUTHLESS_CRITIC,
        CriticPersona.Role.HISTORIAN,
        CriticPersona.Role.MODERN_DEFENDER,
        CriticPersona.Role.ANIME_SPECIALIST,
        CriticPersona.Role.LITERARY_EDITOR,
        CriticPersona.Role.MOOD_DOCTOR,
        CriticPersona.Role.COMPLETION_STRATEGIST,
        CriticPersona.Role.WILDCARD,
    }
    assert CriticPersona.objects.filter(owner=other).count() == 8
    assert set(CriticPersona.objects.filter(owner=user).values_list("id", flat=True)).isdisjoint(
        set(CriticPersona.objects.filter(owner=other).values_list("id", flat=True))
    )


def test_council_session_generation_synthesizes_critic_disagreement() -> None:
    user = create_user("council-generate@example.com")
    candidate = create_candidate(user)

    session = run_council_session(
        owner=user,
        candidate=candidate,
        prompt="I want a fair but strict debate before watching tonight.",
    )

    assert session.candidate == candidate
    assert len(session.critic_opinions) == 8
    assert {opinion["role"] for opinion in session.critic_opinions} >= {
        "ruthless_critic",
        "modern_defender",
        "completion_strategist",
    }
    assert session.final_decision in {"watch_now", "sample", "delay", "skip"}
    assert "not a hidden score average" in session.final_explanation
    assert candidate.evaluations.exists()


def test_disabled_persona_is_omitted_from_session() -> None:
    user = create_user("council-disabled@example.com")
    candidate = create_candidate(user)
    get_personas_for_user(user)
    CriticPersona.objects.filter(owner=user, role=CriticPersona.Role.WILDCARD).update(
        is_enabled=False,
    )

    session = run_council_session(owner=user, candidate=candidate)

    assert "wildcard" not in {opinion["role"] for opinion in session.critic_opinions}


def test_apply_council_decision_updates_candidate_status() -> None:
    user = create_user("council-apply@example.com")
    candidate = create_candidate(user)
    session = run_council_session(owner=user, candidate=candidate)

    applied = apply_council_decision(session)
    session.refresh_from_db()

    assert applied == candidate
    candidate.refresh_from_db()
    assert candidate.status == session.final_decision
    assert session.applied_to_candidate is True


def test_persona_and_session_endpoints_support_update_and_generation() -> None:
    client, user = authenticated_client()
    candidate = create_candidate(user)
    media = create_media(user)
    other = create_user("council-private@example.com")
    private_candidate = create_candidate(other, "Private Candidate")

    persona_response = client.get(reverse("critic-persona-list"))
    assert persona_response.status_code == status.HTTP_200_OK
    personas = persona_response.json()["results"]
    assert len(personas) == 8
    ruthless = next(persona for persona in personas if persona["role"] == "ruthless_critic")

    patch_response = client.patch(
        reverse("critic-persona-detail", args=[ruthless["id"]]),
        {"isEnabled": False, "weight": 4},
        format="json",
    )
    assert patch_response.status_code == status.HTTP_200_OK
    assert patch_response.json()["isEnabled"] is False
    assert patch_response.json()["weight"] == 4

    session_response = client.post(
        reverse("council-session-list"),
        {
            "candidateId": str(candidate.id),
            "mediaItemId": str(media.id),
            "prompt": "Debate this with strict time protection.",
        },
        format="json",
    )
    assert session_response.status_code == status.HTTP_201_CREATED
    payload = session_response.json()
    assert payload["candidateId"] == str(candidate.id)
    assert payload["mediaItemId"] == str(media.id)
    assert "ruthless_critic" not in {opinion["role"] for opinion in payload["criticOpinions"]}
    assert payload["finalDecision"]["decision"] in {"watch_now", "sample", "delay", "skip"}

    apply_response = client.post(
        reverse("council-session-apply-to-candidate", args=[payload["id"]]),
        format="json",
    )
    assert apply_response.status_code == status.HTTP_200_OK
    assert apply_response.json()["candidate"]["status"] == payload["finalDecision"]["decision"]

    list_response = client.get(reverse("council-session-list"), {"candidateId": str(candidate.id)})
    private_response = client.post(
        reverse("council-session-list"),
        {"candidateId": str(private_candidate.id)},
        format="json",
    )

    assert list_response.status_code == status.HTTP_200_OK
    assert list_response.json()["count"] == 1
    assert private_response.status_code == status.HTTP_400_BAD_REQUEST


def test_council_endpoints_appear_in_openapi_schema() -> None:
    response = APIClient().get(reverse("schema"))

    assert response.status_code == status.HTTP_200_OK
    content = response.content.decode()
    assert "/api/critic-personas/" in content
    assert "/api/council-sessions/" in content
