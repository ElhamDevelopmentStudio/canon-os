from __future__ import annotations

import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from canonos.aftertaste.models import AftertasteEntry
from canonos.media.models import MediaItem

pytestmark = pytest.mark.django_db


def create_user(email: str = "aftertaste@example.com") -> User:
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
        media_type="movie",
        status="completed",
    )


def aftertaste_payload(media: MediaItem, **overrides):  # noqa: ANN003, ANN201
    payload = {
        "mediaItemId": str(media.id),
        "worthTime": True,
        "stayedWithMeScore": 9,
        "feltAlive": True,
        "feltGeneric": False,
        "completionReason": "Completed",
        "whatWorked": "Atmosphere and patience.",
        "whatFailed": "Nothing major.",
        "finalThoughts": "Still echoing after the ending.",
        "appetiteEffect": "more_like_this",
    }
    payload.update(overrides)
    return payload


def test_aftertaste_create_assigns_owner_and_media_snapshot() -> None:
    client, user = authenticated_client()
    media = create_media(user)

    response = client.post(
        reverse("aftertasteentry-list"), aftertaste_payload(media), format="json"
    )

    assert response.status_code == status.HTTP_201_CREATED
    payload = response.json()
    assert payload["mediaItemId"] == str(media.id)
    assert payload["mediaTitle"] == "Stalker"
    assert payload["worthTime"] is True
    assert payload["stayedWithMeScore"] == 9
    assert payload["finalThoughts"] == "Still echoing after the ending."
    assert AftertasteEntry.objects.get(id=payload["id"]).owner == user


def test_aftertaste_list_update_and_delete_are_owner_scoped() -> None:
    client, user = authenticated_client()
    media = create_media(user, "Mushishi")
    entry = AftertasteEntry.objects.create(
        owner=user,
        media_item=media,
        worth_time=True,
        stayed_with_me_score=8,
        felt_alive=True,
        felt_generic=False,
        completion_reason="Completed",
        final_thoughts="Quietly restorative.",
        appetite_effect="only_in_mood",
    )

    list_response = client.get(reverse("aftertasteentry-list"))
    update_response = client.patch(
        reverse("aftertasteentry-detail", args=[entry.id]),
        {
            "stayedWithMeScore": 10,
            "feltGeneric": True,
            "finalThoughts": "Even stronger after a day.",
        },
        format="json",
    )
    delete_response = client.delete(reverse("aftertasteentry-detail", args=[entry.id]))

    assert list_response.status_code == status.HTTP_200_OK
    assert list_response.json()["count"] == 1
    assert list_response.json()["results"][0]["mediaTitle"] == "Mushishi"
    assert update_response.status_code == status.HTTP_200_OK
    assert update_response.json()["stayedWithMeScore"] == 10
    assert update_response.json()["feltGeneric"] is True
    assert delete_response.status_code == status.HTTP_204_NO_CONTENT
    assert not AftertasteEntry.objects.filter(id=entry.id).exists()


def test_aftertaste_media_ownership_protection() -> None:
    owner = create_user("aftertaste-owner@example.com")
    other = create_user("aftertaste-other@example.com")
    private_media = create_media(owner, "Private Media")
    private_entry = AftertasteEntry.objects.create(
        owner=owner,
        media_item=private_media,
        worth_time=True,
        stayed_with_me_score=7,
        felt_alive=True,
        felt_generic=False,
        appetite_effect="no_change",
    )
    client, _ = authenticated_client(other)

    list_response = client.get(reverse("aftertasteentry-list"))
    detail_response = client.get(reverse("aftertasteentry-detail", args=[private_entry.id]))
    create_response = client.post(
        reverse("aftertasteentry-list"),
        aftertaste_payload(private_media),
        format="json",
    )

    assert list_response.status_code == status.HTTP_200_OK
    assert list_response.json()["results"] == []
    assert detail_response.status_code == status.HTTP_404_NOT_FOUND
    assert create_response.status_code == status.HTTP_400_BAD_REQUEST
    assert create_response.json()["error"]["details"]["mediaItemId"] == ["Media item not found."]


def test_media_detail_includes_latest_aftertaste_entry() -> None:
    client, user = authenticated_client()
    media = create_media(user, "Perfect Blue")
    AftertasteEntry.objects.create(
        owner=user,
        media_item=media,
        worth_time=False,
        stayed_with_me_score=6,
        felt_alive=True,
        felt_generic=False,
        final_thoughts="Good, but too stressful for tonight.",
        appetite_effect="only_in_mood",
    )
    latest = AftertasteEntry.objects.create(
        owner=user,
        media_item=media,
        worth_time=True,
        stayed_with_me_score=10,
        felt_alive=True,
        felt_generic=False,
        final_thoughts="The afterimage kept growing.",
        appetite_effect="more_like_this",
    )

    response = client.get(reverse("mediaitem-detail", args=[media.id]))

    assert response.status_code == status.HTTP_200_OK
    payload = response.json()
    assert payload["latestAftertaste"]["id"] == str(latest.id)
    assert payload["latestAftertaste"]["finalThoughts"] == "The afterimage kept growing."


def test_aftertaste_prompts_and_schema_are_available() -> None:
    client, _ = authenticated_client()

    prompts_response = client.get(reverse("aftertaste-prompts"))
    schema_response = APIClient().get(reverse("schema"))

    assert prompts_response.status_code == status.HTTP_200_OK
    assert prompts_response.json()[0]["id"] == "worth_time"
    assert schema_response.status_code == status.HTTP_200_OK
    content = schema_response.content.decode()
    assert "/api/aftertaste/" in content
    assert "/api/aftertaste/prompts/" in content
