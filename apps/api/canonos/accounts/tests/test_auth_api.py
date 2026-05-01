from __future__ import annotations

import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from canonos.accounts.models import UserProfile

pytestmark = pytest.mark.django_db


def test_registration_creates_user_profile_and_session() -> None:
    client = APIClient()

    response = client.post(
        reverse("auth-register"),
        {
            "email": "reader@example.com",
            "password": "strong-password",
            "displayName": "Canon Reader",
        },
        format="json",
    )

    assert response.status_code == status.HTTP_201_CREATED
    payload = response.json()
    assert payload["authenticated"] is True
    assert payload["user"]["email"] == "reader@example.com"
    assert payload["user"]["profile"]["displayName"] == "Canon Reader"
    assert User.objects.filter(email="reader@example.com").exists()
    assert UserProfile.objects.filter(display_name="Canon Reader").exists()


def test_login_returns_current_user_session() -> None:
    User.objects.create_user(
        username="reader@example.com", email="reader@example.com", password="strong-password"
    )
    UserProfile.objects.create(
        user=User.objects.get(email="reader@example.com"), display_name="Canon Reader"
    )
    client = APIClient()

    response = client.post(
        reverse("auth-login"),
        {"email": "reader@example.com", "password": "strong-password"},
        format="json",
    )

    assert response.status_code == status.HTTP_200_OK
    payload = response.json()
    assert payload["authenticated"] is True
    assert payload["user"]["profile"]["timezone"] == "UTC"


def test_current_user_endpoint_returns_session_state_and_profile() -> None:
    client = APIClient()
    anonymous_response = client.get(reverse("auth-me"))
    assert anonymous_response.status_code == status.HTTP_200_OK
    anonymous_payload = anonymous_response.json()
    assert anonymous_payload["authenticated"] is False
    assert anonymous_payload["user"] is None

    user = User.objects.create_user(
        username="reader@example.com", email="reader@example.com", password="strong-password"
    )
    UserProfile.objects.create(user=user, display_name="Canon Reader")
    client.force_authenticate(user=user)

    response = client.get(reverse("auth-me"))

    assert response.status_code == status.HTTP_200_OK
    payload = response.json()
    assert payload["authenticated"] is True
    assert payload["user"]["email"] == "reader@example.com"


def test_current_user_endpoint_allows_credentialed_frontend_origin() -> None:
    response = APIClient().get(reverse("auth-me"), HTTP_ORIGIN="http://localhost:5173")

    assert response.status_code == status.HTTP_200_OK
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert response.headers["access-control-allow-credentials"] == "true"


def test_profile_update_endpoint_updates_current_user_profile() -> None:
    user = User.objects.create_user(
        username="reader@example.com", email="reader@example.com", password="strong-password"
    )
    UserProfile.objects.create(user=user, display_name="Canon Reader")
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.patch(
        reverse("auth-profile"),
        {"displayName": "Updated Reader", "timezone": "Asia/Kabul", "preferredLanguage": "en-US"},
        format="json",
    )

    assert response.status_code == status.HTTP_200_OK
    payload = response.json()
    assert payload == {
        "id": user.profile.id,
        "displayName": "Updated Reader",
        "timezone": "Asia/Kabul",
        "preferredLanguage": "en-US",
    }


def test_auth_endpoints_appear_in_openapi_schema() -> None:
    response = APIClient().get(reverse("schema"))

    assert response.status_code == status.HTTP_200_OK
    content = response.content.decode()
    assert "/api/auth/register/" in content
    assert "/api/auth/login/" in content
    assert "/api/auth/logout/" in content
    assert "/api/auth/me/" in content
