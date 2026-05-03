from __future__ import annotations

import pytest
from django.conf import settings as django_settings
from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.checks import Tags, run_checks
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from canonos.accounts.models import AuditEvent, UserProfile, UserSettings
from canonos.aftertaste.models import AftertasteEntry
from canonos.candidates.models import Candidate
from canonos.graph.models import GraphNode
from canonos.imports.models import ExportJob
from canonos.media.models import MediaItem
from canonos.queueing.models import QueueItem
from canonos.taste.models import TasteDimension

pytestmark = pytest.mark.django_db


def test_csrf_endpoint_returns_token_cookie_and_cors_headers() -> None:
    response = APIClient().get(reverse("auth-csrf"), HTTP_ORIGIN="http://localhost:5173")

    assert response.status_code == status.HTTP_200_OK
    payload = response.json()
    assert payload["authenticated"] is False
    assert payload["user"] is None
    assert payload["csrfToken"]
    assert "csrftoken" in response.cookies
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert response.headers["access-control-allow-credentials"] == "true"


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
    assert UserSettings.objects.filter(user__email="reader@example.com").exists()


def test_auth_rate_limit_protects_login_endpoint() -> None:
    cache.clear()
    rest_framework_settings = {
        **django_settings.REST_FRAMEWORK,
        "DEFAULT_THROTTLE_RATES": {
            **django_settings.REST_FRAMEWORK.get("DEFAULT_THROTTLE_RATES", {}),
            "auth": "2/min",
        },
    }

    with override_settings(REST_FRAMEWORK=rest_framework_settings):
        client = APIClient()
        responses = [
            client.post(
                reverse("auth-login"),
                {"email": "missing@example.com", "password": "bad-password"},
                format="json",
                REMOTE_ADDR="198.51.100.10",
            )
            for _ in range(3)
        ]
    cache.clear()

    assert [response.status_code for response in responses[:2]] == [
        status.HTTP_400_BAD_REQUEST,
        status.HTTP_400_BAD_REQUEST,
    ]
    assert responses[2].status_code == status.HTTP_429_TOO_MANY_REQUESTS


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
    assert AuditEvent.objects.filter(
        actor__email="reader@example.com",
        event_type=AuditEvent.EventType.LOGIN,
    ).exists()


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


def test_settings_endpoint_returns_defaults_and_updates_profile_display_and_recommendations() -> (
    None
):
    user = User.objects.create_user(
        username="settings@example.com", email="settings@example.com", password="strong-password"
    )
    UserProfile.objects.create(user=user, display_name="Settings Reader")
    client = APIClient()
    client.force_authenticate(user=user)

    default_response = client.get(reverse("auth-settings"))

    assert default_response.status_code == status.HTTP_200_OK
    default_payload = default_response.json()
    assert default_payload["profile"]["displayName"] == "Settings Reader"
    assert default_payload["recommendation"]["defaultRiskTolerance"] == "medium"
    assert default_payload["recommendation"]["defaultTonightMode"] == {
        "availableMinutes": 90,
        "energyLevel": "medium",
        "focusLevel": "medium",
        "desiredEffect": "quality",
    }
    assert default_payload["recommendation"]["recommendationFormulaWeights"]["personalFit"] == 30
    assert default_payload["recommendation"]["allowModernExceptions"] is True
    assert (
        default_payload["recommendation"]["notificationPreferences"]["recommendationReminders"]
        is True
    )
    assert default_payload["display"]["themePreference"] == "system"

    update_response = client.patch(
        reverse("auth-settings"),
        {
            "profile": {"displayName": "Updated Settings", "timezone": "Asia/Kabul"},
            "display": {"themePreference": "dark"},
            "recommendation": {
                "defaultMediaTypes": ["movie", "novel"],
                "defaultRiskTolerance": "high",
                "modernMediaSkepticismLevel": 8,
                "genericnessSensitivity": 9,
                "preferredRecommendationStrictness": 7,
                "recommendationFormulaWeights": {
                    "personalFit": 36,
                    "moodFit": 18,
                    "qualitySignal": 24,
                    "genericnessPenalty": 20,
                    "regretRiskPenalty": 12,
                    "commitmentCostPenalty": 8,
                },
                "defaultTonightMode": {
                    "availableMinutes": 75,
                    "energyLevel": "low",
                    "focusLevel": "deep",
                    "desiredEffect": "comfort",
                },
                "allowModernExceptions": False,
                "burnoutSensitivity": 8,
                "completionDetoxStrictness": 9,
                "notificationPreferences": {
                    "browserNotifications": True,
                    "emailDigest": True,
                    "recommendationReminders": False,
                },
            },
        },
        format="json",
    )

    assert update_response.status_code == status.HTTP_200_OK
    payload = update_response.json()
    assert payload["profile"]["displayName"] == "Updated Settings"
    assert payload["profile"]["timezone"] == "Asia/Kabul"
    assert payload["display"]["themePreference"] == "dark"
    assert payload["recommendation"]["defaultMediaTypes"] == ["movie", "novel"]
    assert payload["recommendation"]["defaultRiskTolerance"] == "high"
    assert payload["recommendation"]["genericnessSensitivity"] == 9
    assert payload["recommendation"]["preferredRecommendationStrictness"] == 7
    assert payload["recommendation"]["preferredScoringStrictness"] == 7
    assert payload["recommendation"]["recommendationFormulaWeights"]["qualitySignal"] == 24
    assert payload["recommendation"]["defaultTonightMode"]["availableMinutes"] == 75
    assert payload["recommendation"]["defaultTonightMode"]["focusLevel"] == "deep"
    assert payload["recommendation"]["allowModernExceptions"] is False
    assert payload["recommendation"]["burnoutSensitivity"] == 8
    assert payload["recommendation"]["completionDetoxStrictness"] == 9
    assert payload["recommendation"]["notificationPreferences"]["browserNotifications"] is True
    assert payload["recommendation"]["notificationPreferences"]["completionDetoxReminders"] is True
    assert AuditEvent.objects.filter(
        actor=user,
        event_type=AuditEvent.EventType.SETTINGS_UPDATED,
    ).exists()


def test_personal_data_deletion_removes_product_records_but_keeps_account() -> None:
    user = User.objects.create_user(
        username="delete-data@example.com",
        email="delete-data@example.com",
        password="strong-password",
    )
    UserProfile.objects.create(user=user, display_name="Delete Data")
    media_item = MediaItem.objects.create(
        owner=user,
        title="Private notes",
        media_type="movie",
        status="completed",
        notes="Private reflection",
    )
    candidate = Candidate.objects.create(owner=user, title="Private candidate", media_type="novel")
    QueueItem.objects.create(
        owner=user,
        media_item=media_item,
        title="Private queue",
        media_type="movie",
        queue_position=1,
    )
    AftertasteEntry.objects.create(owner=user, media_item=media_item, stayed_with_me_score=7)
    GraphNode.objects.create(
        owner=user,
        node_type=GraphNode.NodeType.MEDIA,
        label="Private graph",
        slug="private-graph",
    )
    ExportJob.objects.create(
        owner=user,
        format=ExportJob.Format.JSON,
        filename="canonos-export.json",
        content_type="application/json",
        payload_text="{}",
        record_count=1,
    )
    TasteDimension.objects.create(
        owner=user,
        slug="custom",
        name="Custom private signal",
        direction=TasteDimension.Direction.POSITIVE,
    )
    client = APIClient()
    client.force_authenticate(user=user)

    summary_response = client.get(reverse("auth-data-summary"))
    delete_response = client.delete(reverse("auth-data-delete"))

    assert summary_response.status_code == status.HTTP_200_OK
    assert summary_response.json()["counts"]["mediaItems"] == 1
    assert delete_response.status_code == status.HTTP_200_OK
    payload = delete_response.json()
    assert payload["deletedCounts"]["mediaItems"] == 1
    assert payload["deletedCounts"]["candidates"] == 1
    assert payload["totalDeleted"] >= 6
    assert User.objects.filter(id=user.id).exists()
    assert not MediaItem.objects.filter(owner=user).exists()
    assert not Candidate.objects.filter(owner=user, id=candidate.id).exists()
    assert not QueueItem.objects.filter(owner=user).exists()
    assert not AftertasteEntry.objects.filter(owner=user).exists()
    assert not GraphNode.objects.filter(owner=user).exists()
    assert not ExportJob.objects.filter(owner=user).exists()
    assert not TasteDimension.objects.filter(owner=user, slug="custom").exists()
    assert TasteDimension.objects.filter(owner=user, is_default=True).exists()
    assert AuditEvent.objects.filter(
        actor=user,
        event_type=AuditEvent.EventType.DATA_DELETION_REQUESTED,
    ).exists()


def test_account_deletion_removes_user_and_preserves_audit_marker() -> None:
    user = User.objects.create_user(
        username="delete-account@example.com",
        email="delete-account@example.com",
        password="strong-password",
    )
    UserProfile.objects.create(user=user, display_name="Delete Account")
    MediaItem.objects.create(owner=user, title="Delete with account", media_type="movie")
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.delete(reverse("auth-account-delete"))

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["deleted"] is True
    assert not User.objects.filter(email="delete-account@example.com").exists()
    assert not MediaItem.objects.filter(title="Delete with account").exists()
    audit_event = AuditEvent.objects.get(event_type=AuditEvent.EventType.ACCOUNT_DELETION_REQUESTED)
    assert audit_event.actor is None
    assert audit_event.actor_hash


def test_expensive_candidate_generation_endpoint_is_rate_limited() -> None:
    from canonos.candidates.models import Candidate

    cache.clear()
    rest_framework_settings = {
        **django_settings.REST_FRAMEWORK,
        "DEFAULT_THROTTLE_RATES": {
            **django_settings.REST_FRAMEWORK.get("DEFAULT_THROTTLE_RATES", {}),
            "expensive": "2/min",
        },
    }
    user = User.objects.create_user(
        username="expensive@example.com",
        email="expensive@example.com",
        password="strong-password",
    )
    candidate = Candidate.objects.create(owner=user, title="Rate limited", media_type="movie")
    client = APIClient()
    client.force_authenticate(user=user)

    with override_settings(REST_FRAMEWORK=rest_framework_settings):
        responses = [
            client.post(reverse("candidate-evaluate", args=[candidate.id]), {}, format="json")
            for _ in range(3)
        ]
    cache.clear()

    assert [response.status_code for response in responses[:2]] == [
        status.HTTP_200_OK,
        status.HTTP_200_OK,
    ]
    assert responses[2].status_code == status.HTTP_429_TOO_MANY_REQUESTS


def test_deployment_security_checks_validate_sensitive_settings() -> None:
    with override_settings(
        SECRET_KEY="short",
        SESSION_COOKIE_SECURE=False,
        CSRF_COOKIE_SECURE=False,
        ALLOWED_HOSTS=["*"],
        CORS_ALLOW_CREDENTIALS=True,
        CORS_ALLOWED_ORIGINS=["*"],
    ):
        messages = run_checks(tags=[Tags.security], include_deployment_checks=True)

    message_ids = {message.id for message in messages}
    assert {
        "canonos.security.E001",
        "canonos.security.E002",
        "canonos.security.E003",
        "canonos.security.E004",
        "canonos.security.E005",
    }.issubset(message_ids)


def test_settings_endpoint_validates_range_and_choices() -> None:
    user = User.objects.create_user(
        username="invalid-settings@example.com",
        email="invalid-settings@example.com",
        password="strong-password",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.patch(
        reverse("auth-settings"),
        {
            "display": {"themePreference": "neon"},
            "recommendation": {
                "genericnessSensitivity": 11,
                "recommendationFormulaWeights": {"personalFit": 101},
            },
        },
        format="json",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    payload = response.json()
    assert payload["error"]["code"] == "invalid_choice"
    assert "themePreference" in payload["error"]["details"]["display"]
    assert "genericnessSensitivity" in payload["error"]["details"]["recommendation"]
    assert "recommendationFormulaWeights" in payload["error"]["details"]["recommendation"]


def test_auth_endpoints_appear_in_openapi_schema() -> None:
    response = APIClient().get(reverse("schema"))

    assert response.status_code == status.HTTP_200_OK
    content = response.content.decode()
    assert "/api/auth/register/" in content
    assert "/api/auth/login/" in content
    assert "/api/auth/logout/" in content
    assert "/api/auth/me/" in content
    assert "/api/auth/settings/" in content
    assert "/api/auth/data/" in content
    assert "/api/auth/data/delete/" in content
    assert "/api/auth/account/" in content
