from __future__ import annotations

import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from canonos.candidates.models import Candidate
from canonos.media.models import MediaItem
from canonos.queueing.models import QueueItem

pytestmark = pytest.mark.django_db


def create_user(email: str = "queue@example.com") -> User:
    return User.objects.create_user(username=email, email=email, password="strong-password")


def authenticated_client(user: User | None = None) -> tuple[APIClient, User]:
    user = user or create_user()
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


def test_queue_item_create_from_candidate_derives_snapshot_fields() -> None:
    client, user = authenticated_client()
    candidate = Candidate.objects.create(
        owner=user,
        title="Perfect Blue",
        media_type="anime",
        expected_time_cost_minutes=81,
    )

    response = client.post(
        reverse("queueitem-list"),
        {
            "candidateId": str(candidate.id),
            "priority": "sample_first",
            "reason": "Evaluation recommended sampling first.",
            "estimatedTimeMinutes": 81,
            "bestMood": "Focused and curious",
        },
        format="json",
    )

    assert response.status_code == status.HTTP_201_CREATED
    payload = response.json()
    assert payload["candidateId"] == str(candidate.id)
    assert payload["title"] == "Perfect Blue"
    assert payload["mediaType"] == "anime"
    assert payload["priority"] == "sample_first"
    assert payload["queuePosition"] == 1


def test_queue_item_create_update_and_delete() -> None:
    client, _ = authenticated_client()

    create_response = client.post(
        reverse("queueitem-list"),
        {
            "title": "Roadside Picnic",
            "mediaType": "novel",
            "priority": "start_soon",
            "reason": "Short and high-fit science fiction.",
            "estimatedTimeMinutes": 360,
            "bestMood": "Deep reading focus",
        },
        format="json",
    )

    assert create_response.status_code == status.HTTP_201_CREATED
    item_id = create_response.json()["id"]

    update_response = client.patch(
        reverse("queueitem-detail", args=[item_id]),
        {"priority": "later", "reason": "Delay until attention is better."},
        format="json",
    )

    assert update_response.status_code == status.HTTP_200_OK
    assert update_response.json()["priority"] == "later"
    assert update_response.json()["reason"] == "Delay until attention is better."

    delete_response = client.delete(reverse("queueitem-detail", args=[item_id]))
    assert delete_response.status_code == status.HTTP_204_NO_CONTENT
    assert QueueItem.objects.count() == 0


def test_queue_reorder_updates_positions() -> None:
    client, user = authenticated_client()
    first = QueueItem.objects.create(
        owner=user,
        title="First",
        media_type="movie",
        priority="start_soon",
        queue_position=1,
    )
    second = QueueItem.objects.create(
        owner=user,
        title="Second",
        media_type="anime",
        priority="sample_first",
        queue_position=2,
    )

    response = client.post(
        reverse("queueitem-reorder"),
        {"itemIds": [str(second.id), str(first.id)]},
        format="json",
    )

    assert response.status_code == status.HTTP_200_OK
    assert [item["title"] for item in response.json()["results"]] == ["Second", "First"]
    first.refresh_from_db()
    second.refresh_from_db()
    assert second.queue_position == 1
    assert first.queue_position == 2


def test_queue_reorder_keeps_omitted_items_after_reordered_items() -> None:
    client, user = authenticated_client()
    first = QueueItem.objects.create(
        owner=user,
        title="First",
        media_type="movie",
        priority="start_soon",
        queue_position=1,
    )
    second = QueueItem.objects.create(
        owner=user,
        title="Second",
        media_type="anime",
        priority="sample_first",
        queue_position=2,
    )
    third = QueueItem.objects.create(
        owner=user,
        title="Third",
        media_type="novel",
        priority="later",
        queue_position=3,
    )

    response = client.post(
        reverse("queueitem-reorder"),
        {"itemIds": [str(third.id)]},
        format="json",
    )

    assert response.status_code == status.HTTP_200_OK
    assert [item["title"] for item in response.json()["results"]] == [
        "Third",
        "First",
        "Second",
    ]
    first.refresh_from_db()
    second.refresh_from_db()
    third.refresh_from_db()
    assert third.queue_position == 1
    assert first.queue_position == 2
    assert second.queue_position == 3


def test_queue_privacy_for_linked_media_and_reorder() -> None:
    owner = create_user("queue-owner@example.com")
    other = create_user("queue-other@example.com")
    media = MediaItem.objects.create(
        owner=owner,
        title="Private Media",
        media_type="movie",
        status="planned",
    )
    item = QueueItem.objects.create(
        owner=owner,
        media_item=media,
        title="Private Media",
        media_type="movie",
        priority="start_soon",
        queue_position=1,
    )
    client, _ = authenticated_client(other)

    list_response = client.get(reverse("queueitem-list"))
    detail_response = client.get(reverse("queueitem-detail", args=[item.id]))
    create_response = client.post(
        reverse("queueitem-list"),
        {"mediaItemId": str(media.id), "priority": "start_soon"},
        format="json",
    )
    reorder_response = client.post(
        reverse("queueitem-reorder"),
        {"itemIds": [str(item.id)]},
        format="json",
    )

    assert list_response.json()["results"] == []
    assert detail_response.status_code == status.HTTP_404_NOT_FOUND
    assert create_response.status_code == status.HTTP_400_BAD_REQUEST
    assert reorder_response.status_code == status.HTTP_400_BAD_REQUEST


def test_queue_endpoints_appear_in_openapi_schema() -> None:
    response = APIClient().get(reverse("schema"))

    assert response.status_code == status.HTTP_200_OK
    content = response.content.decode()
    assert "/api/queue-items/" in content
    assert "/api/queue-items/reorder/" in content
