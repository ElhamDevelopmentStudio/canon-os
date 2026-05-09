from __future__ import annotations

import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from canonos.media.models import MediaItem
from canonos.queueing.models import QueueItem

pytestmark = pytest.mark.django_db


def authenticated_client() -> tuple[APIClient, User]:
    user = User.objects.create_user(
        username="chat@example.com",
        email="chat@example.com",
        password="strong-password",
    )
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


def test_tonight_chat_asks_before_recommending() -> None:
    client, _ = authenticated_client()
    session_response = client.post(
        reverse("chat-session-list"),
        {"module": "tonight"},
        format="json",
    )
    session_id = session_response.json()["id"]

    response = client.post(
        reverse("chat-session-messages", args=[session_id]),
        {"content": "I am tired and want something good."},
        format="json",
    )

    assert response.status_code == status.HTTP_201_CREATED
    payload = response.json()
    assert payload["result"]["action"] == "ask_question"
    assert "time" in payload["assistantMessage"]["content"].casefold()


def test_tonight_chat_runs_existing_recommendation_service() -> None:
    client, user = authenticated_client()
    QueueItem.objects.create(
        owner=user,
        title="Perfect Blue",
        media_type=MediaItem.MediaType.ANIME,
        priority=QueueItem.Priority.START_SOON,
        reason="Short, intense, authored anime.",
        estimated_time_minutes=81,
        best_mood="Focused but tired",
        queue_position=1,
        mood_compatibility=86,
        intensity_level=7,
        complexity_level=6,
        commitment_level=3,
        freshness_score=92,
    )
    session_id = client.post(
        reverse("chat-session-list"),
        {"module": "tonight"},
        format="json",
    ).json()["id"]

    response = client.post(
        reverse("chat-session-messages", args=[session_id]),
        {
            "content": (
                "90 minutes, low energy, medium focus, quality, low risk, anime " "or movie."
            )
        },
        format="json",
    )

    assert response.status_code == status.HTTP_201_CREATED
    payload = response.json()
    assert payload["result"]["action"] == "recommend"
    assert payload["result"]["recommendations"][0]["title"] == "Perfect Blue"
    assert payload["assistantMessage"]["metadata"]["provider"] in {"deterministic", "minimax"}


def test_chat_message_stream_returns_sse_final_payload() -> None:
    client, user = authenticated_client()
    QueueItem.objects.create(
        owner=user,
        title="Perfect Blue",
        media_type=MediaItem.MediaType.ANIME,
        priority=QueueItem.Priority.START_SOON,
        reason="Short, intense, authored anime.",
        estimated_time_minutes=81,
        best_mood="Focused but tired",
        queue_position=1,
        mood_compatibility=86,
        intensity_level=7,
        complexity_level=6,
        commitment_level=3,
        freshness_score=92,
    )
    session_id = client.post(
        reverse("chat-session-list"),
        {"module": "tonight"},
        format="json",
    ).json()["id"]

    response = client.post(
        reverse("chat-session-messages-stream", args=[session_id]),
        {"content": ("90 minutes, low energy, medium focus, quality, low risk, anime or movie.")},
        format="json",
    )

    assert response.status_code == status.HTTP_200_OK
    assert response["Content-Type"].startswith("text/event-stream")
    body = b"".join(response.streaming_content).decode("utf-8")
    assert "event: content" in body
    assert "event: final" in body
    assert "Perfect Blue" in body


def test_candidate_chat_creates_and_evaluates_candidate() -> None:
    client, _ = authenticated_client()
    session_id = client.post(
        reverse("chat-session-list"),
        {"module": "candidate"},
        format="json",
    ).json()["id"]

    response = client.post(
        reverse("chat-session-messages", args=[session_id]),
        {
            "content": (
                '"Angel\'s Egg" anime. A silent symbolic world about faith and ruins. '
                "It is not generic and takes 71 minutes."
            )
        },
        format="json",
    )

    assert response.status_code == status.HTTP_201_CREATED
    payload = response.json()
    assert payload["result"]["action"] == "recommend"
    assert payload["result"]["candidate"]["title"] == "Angel's Egg"
    assert payload["result"]["evaluation"]["decision"] in {"watch_now", "sample", "delay", "skip"}


def test_discovery_chat_uses_minimax_generation_with_modern_filter(monkeypatch) -> None:  # noqa: ANN001
    class FakeMiniMaxClient:
        is_configured = True

        def chat_json(self, **kwargs) -> dict[str, object]:  # noqa: ANN003
            if kwargs["max_completion_tokens"] < 1000:
                return {
                    "slots": {
                        "theme": "mindfuck movie",
                        "mediaType": "movie",
                        "era": "modern_exception",
                    }
                }
            return {
                "draft": {
                    "name": "Modern Exception: mindfuck movie",
                    "theme": "mindfuck movie",
                },
                "results": [
                    {
                        "title": "The Wolf House",
                        "mediaType": "movie",
                        "releaseYear": 2018,
                        "countryLanguage": "Chile / Spanish",
                        "creator": "Cristobal Leon and Joaquin Cocina",
                        "premise": "A shifting stop-motion nightmare about memory and captivity.",
                        "discoveryScore": 91,
                        "obscurityScore": 86,
                        "confidenceScore": 78,
                        "estimatedTimeMinutes": 75,
                        "reasons": [
                            {
                                "kind": "taste_expansion",
                                "label": "Taste expansion",
                                "detail": "Modern, strange, and non-obvious.",
                                "weight": 24,
                            }
                        ],
                        "expansionRationale": "A modern exception outside obvious lists.",
                        "riskRationale": "Formally severe.",
                        "suggestedAction": "Queue as a focused sample.",
                    },
                    {
                        "title": "A Page of Madness",
                        "mediaType": "movie",
                        "releaseYear": 1926,
                    },
                ],
            }

    class FakeWebSearchClient:
        def search_text(self, query: str) -> str:
            return f"Search context for {query}"

    from canonos.chat import services

    monkeypatch.setattr(services, "MiniMaxClient", FakeMiniMaxClient)
    monkeypatch.setattr(services, "WebSearchClient", FakeWebSearchClient)
    client, _ = authenticated_client()
    session_id = client.post(
        reverse("chat-session-list"),
        {"module": "discovery"},
        format="json",
    ).json()["id"]

    response = client.post(
        reverse("chat-session-messages", args=[session_id]),
        {"content": "Mindfuck movie, modern exceptions"},
        format="json",
    )

    assert response.status_code == status.HTTP_201_CREATED
    payload = response.json()
    assert payload["assistantMessage"]["metadata"]["provider"] == "minimax"
    assert [result["title"] for result in payload["result"]["results"]] == ["The Wolf House"]
    assert all(result["releaseYear"] >= 2017 for result in payload["result"]["results"])


def test_discovery_chat_fallback_respects_post_year_when_minimax_fails(monkeypatch) -> None:  # noqa: ANN001
    class FailingMiniMaxClient:
        is_configured = True

        def chat_json(self, **kwargs) -> dict[str, object]:  # noqa: ANN003
            raise TimeoutError("provider timeout")

    class FakeWebSearchClient:
        def search_text(self, query: str) -> str:
            return ""

    from canonos.chat import services

    monkeypatch.setattr(services, "MiniMaxClient", FailingMiniMaxClient)
    monkeypatch.setattr(services, "WebSearchClient", FakeWebSearchClient)
    client, _ = authenticated_client()
    session_id = client.post(
        reverse("chat-session-list"),
        {"module": "discovery"},
        format="json",
    ).json()["id"]

    response = client.post(
        reverse("chat-session-messages", args=[session_id]),
        {"content": "Mindfuck movies post 2010"},
        format="json",
    )

    assert response.status_code == status.HTTP_201_CREATED
    payload = response.json()
    assert payload["assistantMessage"]["metadata"]["provider"] == "deterministic"
    assert payload["assistantMessage"]["metadata"]["slots"]["releaseYearMin"] == 2011
    assert payload["result"]["results"]
    assert all(result["releaseYear"] >= 2011 for result in payload["result"]["results"])
