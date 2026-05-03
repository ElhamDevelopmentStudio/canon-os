from __future__ import annotations

import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from canonos.candidates.models import Candidate
from canonos.canon.models import CanonSeason
from canonos.media.models import MediaItem
from canonos.queueing.models import QueueItem

pytestmark = pytest.mark.django_db


def create_user(email: str = "searcher@example.com") -> User:
    return User.objects.create_user(username=email, email=email, password="strong-password")


def authenticated_client(user: User | None = None) -> tuple[APIClient, User]:
    user = user or create_user()
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


def test_unified_search_returns_owned_media_candidate_queue_and_season_results() -> None:
    client, user = authenticated_client()
    other = create_user("other-searcher@example.com")
    media = MediaItem.objects.create(
        owner=user,
        title="Solaris Archive",
        media_type="movie",
        status="completed",
        creator="Andrei Tarkovsky",
    )
    candidate = Candidate.objects.create(
        owner=user,
        title="Solaris Remake Candidate",
        media_type="movie",
        known_creator="Steven Soderbergh",
    )
    queue_item = QueueItem.objects.create(
        owner=user,
        title="Solaris Rewatch Queue",
        media_type="movie",
        priority="sample_first",
        reason="Compare memory against current taste.",
    )
    season = CanonSeason.objects.create(
        owner=user,
        title="Solaris Moral Collapse Season",
        theme="moral_collapse",
        description="Memory, faith, grief, and impossible contact.",
    )
    MediaItem.objects.create(
        owner=other,
        title="Solaris Private Copy",
        media_type="movie",
        status="completed",
    )

    response = client.get(reverse("unified-search"), {"q": "Solaris"})

    assert response.status_code == status.HTTP_200_OK
    payload = response.json()
    assert payload["query"] == "Solaris"
    assert payload["count"] == 4
    result_ids = {result["id"] for result in payload["results"]}
    assert result_ids == {str(media.id), str(candidate.id), str(queue_item.id), str(season.id)}
    assert {result["type"] for result in payload["results"]} == {
        "media",
        "candidate",
        "queue_item",
        "canon_season",
    }
    assert any(result["targetUrl"] == f"/library/{media.id}" for result in payload["results"])
    assert any(
        result["targetUrl"] == f"/candidates?candidateId={candidate.id}"
        for result in payload["results"]
    )


def test_unified_search_finds_canon_season_by_theme() -> None:
    client, user = authenticated_client()
    season = CanonSeason.objects.create(
        owner=user,
        title="Exceptions Project",
        theme="modern_works_worth_it",
        description="Find rare recent works with real payoff.",
    )

    response = client.get(reverse("unified-search"), {"q": "modern"})

    assert response.status_code == status.HTTP_200_OK
    payload = response.json()
    assert payload["count"] == 1
    assert payload["results"][0]["id"] == str(season.id)
    assert payload["results"][0]["type"] == "canon_season"


def test_unified_search_requires_authentication() -> None:
    response = APIClient().get(reverse("unified-search"), {"q": "Solaris"})

    assert response.status_code in {status.HTTP_403_FORBIDDEN, status.HTTP_401_UNAUTHORIZED}
