from __future__ import annotations

import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from canonos.candidates.models import Candidate
from canonos.canon.models import CanonSeason, CanonSeasonItem
from canonos.media.models import MediaItem

pytestmark = pytest.mark.django_db


def create_user(email: str = "canon@example.com") -> User:
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
        status=MediaItem.ConsumptionStatus.PLANNED,
    )


def create_candidate(user: User, title: str = "Roadside Picnic") -> Candidate:
    return Candidate.objects.create(
        owner=user,
        title=title,
        media_type=MediaItem.MediaType.NOVEL,
    )


def test_create_canon_season_with_reflection_prompts() -> None:
    client, _ = authenticated_client()

    response = client.post(
        reverse("canonseason-list"),
        {
            "title": "Moral Collapse Season",
            "theme": "moral_collapse",
            "description": "A focused path about pressure, choice, and consequence.",
            "status": "active",
            "startDate": "2026-05-04",
        },
        format="json",
    )

    assert response.status_code == status.HTTP_201_CREATED
    payload = response.json()
    assert payload["title"] == "Moral Collapse Season"
    assert payload["theme"] == "moral_collapse"
    assert payload["status"] == "active"
    assert payload["itemCount"] == 0
    assert payload["progressPercent"] == 0
    assert any("collapse" in prompt.casefold() for prompt in payload["reflectionPrompts"])


def test_add_items_from_media_candidate_and_custom_title() -> None:
    client, user = authenticated_client()
    media = create_media(user)
    candidate = create_candidate(user)
    season = CanonSeason.objects.create(
        owner=user,
        title="Atmosphere Over Plot",
        theme=CanonSeason.Theme.ATMOSPHERE_OVER_PLOT,
    )

    media_response = client.post(
        reverse("canonseason-add-item", args=[season.id]),
        {
            "mediaItemId": str(media.id),
            "reasonIncluded": "Defines patient atmosphere.",
            "whatToPayAttentionTo": "Notice image rhythm and silence.",
        },
        format="json",
    )
    candidate_response = client.post(
        reverse("canonseason-add-item", args=[season.id]),
        {
            "candidateId": str(candidate.id),
            "reasonIncluded": "Source text for the adaptation.",
            "whatToPayAttentionTo": "Compare philosophical density.",
        },
        format="json",
    )
    custom_response = client.post(
        reverse("canonseason-add-item", args=[season.id]),
        {
            "titleSnapshot": "Custom listening session",
            "mediaType": "audiobook",
            "reasonIncluded": "A contrast point for mood without plot pressure.",
        },
        format="json",
    )

    assert media_response.status_code == status.HTTP_201_CREATED
    assert candidate_response.status_code == status.HTTP_201_CREATED
    assert custom_response.status_code == status.HTTP_201_CREATED
    assert media_response.json()["titleSnapshot"] == media.title
    assert media_response.json()["mediaType"] == "movie"
    assert candidate_response.json()["titleSnapshot"] == candidate.title
    assert candidate_response.json()["mediaType"] == "novel"
    assert custom_response.json()["order"] == 3


def test_canon_item_reorder_and_completion_progress() -> None:
    client, user = authenticated_client()
    season = CanonSeason.objects.create(
        owner=user, title="Modern Works", theme="modern_works_worth_it"
    )
    first = CanonSeasonItem.objects.create(
        season=season,
        title_snapshot="First",
        media_type="movie",
        order=1,
    )
    second = CanonSeasonItem.objects.create(
        season=season,
        title_snapshot="Second",
        media_type="anime",
        order=2,
    )
    third = CanonSeasonItem.objects.create(
        season=season,
        title_snapshot="Third",
        media_type="novel",
        order=3,
    )

    reorder_response = client.post(
        reverse("canonseason-reorder-items", args=[season.id]),
        {"itemIds": [str(third.id), str(first.id), str(second.id)]},
        format="json",
    )

    assert reorder_response.status_code == status.HTTP_200_OK
    assert [item["titleSnapshot"] for item in reorder_response.json()["results"]] == [
        "Third",
        "First",
        "Second",
    ]
    first.refresh_from_db()
    second.refresh_from_db()
    third.refresh_from_db()
    assert third.order == 1
    assert first.order == 2
    assert second.order == 3

    update_response = client.patch(
        reverse("canonseasonitem-detail", args=[season.id, first.id]),
        {"completionStatus": "completed", "canonStatus": "personal_canon"},
        format="json",
    )
    detail_response = client.get(reverse("canonseason-detail", args=[season.id]))

    assert update_response.status_code == status.HTTP_200_OK
    assert update_response.json()["completionStatus"] == "completed"
    assert update_response.json()["canonStatus"] == "personal_canon"
    assert detail_response.status_code == status.HTTP_200_OK
    assert detail_response.json()["completedItemCount"] == 1
    assert detail_response.json()["progressPercent"] == 33


def test_delete_canon_season_item_and_season() -> None:
    client, user = authenticated_client()
    season = CanonSeason.objects.create(owner=user, title="Delete Season", theme="custom")
    removed_item = CanonSeasonItem.objects.create(
        season=season,
        title_snapshot="Remove me",
        media_type="movie",
        order=1,
    )
    retained_item = CanonSeasonItem.objects.create(
        season=season,
        title_snapshot="Remove with season",
        media_type="novel",
        order=2,
    )

    item_response = client.delete(
        reverse("canonseasonitem-detail", args=[season.id, removed_item.id])
    )
    assert item_response.status_code == status.HTTP_204_NO_CONTENT
    assert not CanonSeasonItem.objects.filter(id=removed_item.id).exists()
    assert CanonSeasonItem.objects.filter(id=retained_item.id).exists()

    season_response = client.delete(reverse("canonseason-detail", args=[season.id]))
    assert season_response.status_code == status.HTTP_204_NO_CONTENT
    assert not CanonSeason.objects.filter(id=season.id).exists()
    assert not CanonSeasonItem.objects.filter(id=retained_item.id).exists()


def test_canon_seasons_and_items_are_owner_scoped() -> None:
    client, user = authenticated_client()
    other = create_user("canon-other@example.com")
    owned = CanonSeason.objects.create(owner=user, title="Owned", theme="custom")
    other_season = CanonSeason.objects.create(owner=other, title="Other", theme="custom")
    other_item = CanonSeasonItem.objects.create(
        season=other_season,
        title_snapshot="Other item",
        media_type="movie",
        order=1,
    )
    other_media = create_media(other, "Other media")

    list_response = client.get(reverse("canonseason-list"))
    forbidden_item_response = client.post(
        reverse("canonseason-add-item", args=[owned.id]),
        {"mediaItemId": str(other_media.id)},
        format="json",
    )
    forbidden_detail_response = client.patch(
        reverse("canonseasonitem-detail", args=[other_season.id, other_item.id]),
        {"completionStatus": "completed"},
        format="json",
    )

    assert list_response.status_code == status.HTTP_200_OK
    assert list_response.json()["count"] == 1
    assert list_response.json()["results"][0]["title"] == "Owned"
    assert forbidden_item_response.status_code == status.HTTP_400_BAD_REQUEST
    assert forbidden_detail_response.status_code == status.HTTP_404_NOT_FOUND
