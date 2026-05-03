from __future__ import annotations

import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from canonos.adaptations.models import AdaptationRelation
from canonos.media.models import MediaItem

pytestmark = pytest.mark.django_db


def create_user(email: str = "adaptations@example.com") -> User:
    return User.objects.create_user(username=email, email=email, password="strong-password")


def authenticated_client(user: User | None = None) -> tuple[APIClient, User]:
    user = user or create_user()
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


def create_media(
    user: User,
    title: str,
    media_type: str = MediaItem.MediaType.NOVEL,
) -> MediaItem:
    return MediaItem.objects.create(
        owner=user,
        title=title,
        media_type=media_type,
        status=MediaItem.ConsumptionStatus.PLANNED,
    )


def relation_payload(
    source: MediaItem,
    adaptation: MediaItem,
    **overrides: object,
) -> dict[str, object]:
    payload = {
        "sourceMediaItemId": str(source.id),
        "adaptationMediaItemId": str(adaptation.id),
        "relationType": "novel_to_show",
        "completeness": "partial",
        "faithfulnessScore": 78,
        "pacingPreservationScore": 61,
        "soulPreservationScore": 84,
        "recommendedExperienceOrder": "read_first",
        "notes": "Strong soul, some compression, and no weak ending flagged.",
    }
    payload.update(overrides)
    return payload


def test_create_relation_assigns_owner_and_lists_from_both_media_pages() -> None:
    client, user = authenticated_client()
    source = create_media(user, "Roadside Picnic", MediaItem.MediaType.NOVEL)
    adaptation = create_media(user, "Stalker", MediaItem.MediaType.MOVIE)

    response = client.post(
        reverse("adaptationrelation-list"),
        relation_payload(source, adaptation, relationType="novel_to_film"),
        format="json",
    )
    source_list_response = client.get(
        reverse("adaptationrelation-list"),
        {"mediaItemId": source.id},
    )
    adaptation_list_response = client.get(
        reverse("adaptationrelation-list"),
        {"mediaItemId": adaptation.id},
    )

    assert response.status_code == status.HTTP_201_CREATED
    payload = response.json()
    assert payload["sourceTitle"] == "Roadside Picnic"
    assert payload["adaptationTitle"] == "Stalker"
    assert payload["faithfulnessScore"] == 78
    relation = AdaptationRelation.objects.get(id=payload["id"])
    assert relation.owner == user
    assert source_list_response.status_code == status.HTTP_200_OK
    assert adaptation_list_response.status_code == status.HTTP_200_OK
    assert source_list_response.json()["count"] == 1
    assert adaptation_list_response.json()["results"][0]["id"] == payload["id"]


def test_relation_update_delete_and_owner_scoping() -> None:
    client, user = authenticated_client()
    other_user = create_user("adaptation-other@example.com")
    source = create_media(user, "Dune", MediaItem.MediaType.NOVEL)
    adaptation = create_media(user, "Dune Part One", MediaItem.MediaType.MOVIE)
    other_media = create_media(other_user, "Other Dune", MediaItem.MediaType.MOVIE)
    relation = AdaptationRelation.objects.create(
        owner=user,
        source_media_item=source,
        adaptation_media_item=adaptation,
        relation_type=AdaptationRelation.RelationType.NOVEL_TO_FILM,
        completeness=AdaptationRelation.Completeness.PARTIAL,
        recommended_experience_order=AdaptationRelation.ExperienceOrder.READ_FIRST,
    )

    forbidden_response = client.patch(
        reverse("adaptationrelation-detail", args=[relation.id]),
        {"adaptationMediaItemId": str(other_media.id)},
        format="json",
    )
    update_response = client.patch(
        reverse("adaptationrelation-detail", args=[relation.id]),
        {"completeness": "complete", "soulPreservationScore": 88},
        format="json",
    )
    delete_response = client.delete(reverse("adaptationrelation-detail", args=[relation.id]))

    assert forbidden_response.status_code == status.HTTP_400_BAD_REQUEST
    assert update_response.status_code == status.HTTP_200_OK
    assert update_response.json()["completeness"] == "complete"
    assert update_response.json()["soulPreservationScore"] == 88
    assert delete_response.status_code == status.HTTP_204_NO_CONTENT
    assert not AdaptationRelation.objects.filter(id=relation.id).exists()


def test_relation_rejects_same_source_and_adaptation() -> None:
    client, user = authenticated_client()
    source = create_media(user, "One Work", MediaItem.MediaType.NOVEL)

    response = client.post(
        reverse("adaptationrelation-list"),
        relation_payload(source, source),
        format="json",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "adaptationMediaItemId" in response.json()["error"]["details"]


def test_adaptation_path_recommends_source_first_and_flags_risks() -> None:
    client, user = authenticated_client()
    source = create_media(user, "The Unfinished Manga", MediaItem.MediaType.NOVEL)
    adaptation = create_media(user, "The Rushed Anime", MediaItem.MediaType.ANIME)
    relation = AdaptationRelation.objects.create(
        owner=user,
        source_media_item=source,
        adaptation_media_item=adaptation,
        relation_type=AdaptationRelation.RelationType.MANGA_TO_ANIME,
        completeness=AdaptationRelation.Completeness.INCOMPLETE,
        faithfulness_score=44,
        pacing_preservation_score=35,
        soul_preservation_score=52,
        recommended_experience_order=AdaptationRelation.ExperienceOrder.READ_FIRST,
        notes="Compression is obvious and the weak ending changes the tone.",
    )

    response = client.post(reverse("mediaitem-adaptation-path", args=[source.id]), format="json")
    adaptation_response = client.get(reverse("mediaitem-adaptation-map", args=[adaptation.id]))

    assert response.status_code == status.HTTP_200_OK
    payload = response.json()
    assert payload["mediaItemId"] == str(source.id)
    assert payload["relations"][0]["id"] == str(relation.id)
    assert payload["recommendation"]["recommendation"] in {"source_preferred", "skip_adaptation"}
    risk_kinds = {risk["kind"] for risk in payload["recommendation"]["risks"]}
    assert {"incomplete_adaptation", "compression", "low_faithfulness", "weak_ending"} <= risk_kinds
    assert adaptation_response.status_code == status.HTTP_200_OK
    assert adaptation_response.json()["relations"][0]["id"] == str(relation.id)


def test_adaptation_paths_appear_in_openapi_schema() -> None:
    response = APIClient().get(reverse("schema"))

    assert response.status_code == status.HTTP_200_OK
    content = response.content.decode()
    assert "/api/adaptations/relations/" in content
    assert "/api/media-items/{media_id}/adaptation-map/" in content
    assert "/api/media-items/{media_id}/adaptation-path/" in content
