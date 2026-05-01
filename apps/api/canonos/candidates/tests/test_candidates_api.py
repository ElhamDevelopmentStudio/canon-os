from __future__ import annotations

import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from canonos.candidates.models import Candidate, CandidateEvaluation
from canonos.media.models import MediaItem
from canonos.taste.models import MediaScore
from canonos.taste.services import seed_default_taste_dimensions

pytestmark = pytest.mark.django_db


def create_user(email: str = "candidate@example.com") -> User:
    return User.objects.create_user(username=email, email=email, password="strong-password")


def authenticated_client(user: User | None = None) -> tuple[APIClient, User]:
    user = user or create_user()
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


def create_positive_history(user: User) -> None:
    dimensions = seed_default_taste_dimensions(user)
    story = next(dimension for dimension in dimensions if dimension.slug == "story_depth")
    originality = next(dimension for dimension in dimensions if dimension.slug == "originality")
    genericness = next(dimension for dimension in dimensions if dimension.slug == "genericness")
    first = MediaItem.objects.create(
        owner=user,
        title="Stalker",
        media_type="movie",
        status="completed",
        personal_rating="9.5",
    )
    second = MediaItem.objects.create(
        owner=user,
        title="Solaris",
        media_type="movie",
        status="completed",
        personal_rating="8.5",
    )
    MediaScore.objects.create(media_item=first, taste_dimension=story, score="9.0")
    MediaScore.objects.create(media_item=first, taste_dimension=originality, score="8.0")
    MediaScore.objects.create(media_item=first, taste_dimension=genericness, score="1.0")
    MediaScore.objects.create(media_item=second, taste_dimension=story, score="8.0")


def test_candidate_creation_listing_and_detail() -> None:
    client, _ = authenticated_client()

    response = client.post(
        reverse("candidate-list"),
        {
            "title": "Perfect Blue",
            "mediaType": "anime",
            "releaseYear": 1997,
            "knownCreator": "Satoshi Kon",
            "premise": "A pop idol's identity fractures under pressure.",
            "sourceOfInterest": "Director backlog",
            "hypeLevel": 7,
            "expectedGenericness": 2,
            "expectedTimeCostMinutes": 81,
        },
        format="json",
    )

    assert response.status_code == status.HTTP_201_CREATED
    payload = response.json()
    assert payload["status"] == "unevaluated"
    assert payload["mediaType"] == "anime"
    assert payload["latestEvaluation"] is None

    list_response = client.get(reverse("candidate-list"))
    assert list_response.status_code == status.HTTP_200_OK
    assert list_response.json()["results"][0]["title"] == "Perfect Blue"

    detail_response = client.get(reverse("candidate-detail", args=[payload["id"]]))
    assert detail_response.status_code == status.HTTP_200_OK
    assert detail_response.json()["knownCreator"] == "Satoshi Kon"


def test_evaluate_candidate_uses_history_and_returns_explanation() -> None:
    client, user = authenticated_client()
    create_positive_history(user)
    candidate = Candidate.objects.create(
        owner=user,
        title="A thoughtful slow cinema candidate",
        media_type="movie",
        premise="Patient, formally controlled story about memory and regret.",
        hype_level=6,
        expected_genericness=2,
        expected_time_cost_minutes=95,
    )

    response = client.post(reverse("candidate-evaluate", args=[candidate.id]), format="json")

    assert response.status_code == status.HTTP_200_OK
    payload = response.json()
    evaluation = payload["evaluation"]
    assert evaluation["decision"] in {"watch_now", "sample"}
    assert evaluation["confidenceScore"] >= 60
    assert evaluation["likelyFitScore"] > evaluation["riskScore"]
    assert evaluation["reasonsFor"]
    assert evaluation["reasonsAgainst"]
    assert payload["candidate"]["status"] == evaluation["decision"]
    assert CandidateEvaluation.objects.filter(candidate=candidate).count() == 1


def test_genericness_and_time_penalties_reduce_candidate_decision() -> None:
    client, _ = authenticated_client()
    candidate = Candidate.objects.create(
        owner=create_user("penalty-owner@example.com"),
        title="Expensive trend clone",
        media_type="tv_show",
        premise="A familiar algorithmic genre mix with very high episode commitment.",
        hype_level=9,
        expected_genericness=10,
        expected_time_cost_minutes=900,
    )
    client.force_authenticate(user=candidate.owner)

    response = client.post(reverse("candidate-evaluate", args=[candidate.id]), format="json")

    assert response.status_code == status.HTTP_200_OK
    evaluation = response.json()["evaluation"]
    assert evaluation["riskScore"] >= 80
    assert evaluation["decision"] in {"delay", "skip"}
    assert any("genericness" in reason.lower() for reason in evaluation["reasonsAgainst"])


def test_candidate_privacy_for_list_detail_evaluation_and_update() -> None:
    owner = create_user("candidate-owner@example.com")
    other = create_user("candidate-other@example.com")
    candidate = Candidate.objects.create(
        owner=owner,
        title="Private candidate",
        media_type="novel",
    )
    client, _ = authenticated_client(other)

    assert client.get(reverse("candidate-list")).json()["results"] == []
    detail_response = client.get(reverse("candidate-detail", args=[candidate.id]))
    evaluate_response = client.post(reverse("candidate-evaluate", args=[candidate.id]))
    update_response = client.patch(
        reverse("candidate-detail", args=[candidate.id]),
        {"status": "skip"},
        format="json",
    )

    assert detail_response.status_code == status.HTTP_404_NOT_FOUND
    assert evaluate_response.status_code == status.HTTP_404_NOT_FOUND
    assert update_response.status_code == status.HTTP_404_NOT_FOUND
    candidate.refresh_from_db()
    assert candidate.status == Candidate.Status.UNEVALUATED


def test_add_to_library_creates_private_media_item_from_candidate() -> None:
    client, user = authenticated_client()
    candidate = Candidate.objects.create(
        owner=user,
        title="The Left Hand of Darkness",
        media_type="novel",
        release_year=1969,
        known_creator="Ursula K. Le Guin",
        premise="Political and anthropological science fiction.",
        source_of_interest="Classic backlog",
    )

    response = client.post(
        reverse("candidate-add-to-library", args=[candidate.id]),
        {"status": "planned", "personalRating": None, "notes": "Start during quiet reading week."},
        format="json",
    )

    assert response.status_code == status.HTTP_201_CREATED
    payload = response.json()
    assert payload["mediaItem"]["title"] == candidate.title
    assert payload["mediaItem"]["creator"] == "Ursula K. Le Guin"
    assert payload["mediaItem"]["mediaType"] == "novel"
    assert "Classic backlog" in payload["mediaItem"]["notes"]
    assert MediaItem.objects.filter(owner=user, title=candidate.title).count() == 1


def test_candidate_endpoints_appear_in_openapi_schema() -> None:
    response = APIClient().get(reverse("schema"))

    assert response.status_code == status.HTTP_200_OK
    content = response.content.decode()
    assert "/api/candidates/" in content
    assert "/api/candidates/{id}/evaluate/" in content
    assert "/api/candidates/{id}/add-to-library/" in content
