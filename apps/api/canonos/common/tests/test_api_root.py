from __future__ import annotations

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient


def test_api_root_lists_available_mvp_endpoints() -> None:
    response = APIClient().get(reverse("api-root"))

    assert response.status_code == status.HTTP_200_OK
    payload = response.json()
    assert payload["service"] == "canonos-api"
    assert payload["endpoints"]["health"] == "/api/health/"
    assert payload["endpoints"]["schema"] == "/api/schema/"
    assert payload["endpoints"]["taste_evolution"] == "/api/taste-evolution/"
    assert {module["name"] for module in payload["mvp_modules"]} >= {
        "health",
        "auth",
        "library",
        "discovery",
        "narrative_dna",
        "candidates",
        "critic_council",
        "taste_evolution",
        "tonight_mode",
    }


def test_openapi_schema_is_available_and_documents_api_root() -> None:
    response = APIClient().get(reverse("schema"))

    assert response.status_code == status.HTTP_200_OK
    content = response.content.decode()
    assert "CanonOS API" in content
    assert "/api/" in content
    assert "/api/health/" in content


def test_django_admin_login_loads() -> None:
    response = APIClient().get("/admin/login/")

    assert response.status_code == status.HTTP_200_OK
    assert b"Django administration" in response.content


def test_versioned_api_root_and_health_are_available() -> None:
    client = APIClient()

    root_response = client.get("/api/v1/")
    health_response = client.get("/api/v1/health/")

    assert root_response.status_code == status.HTTP_200_OK
    assert root_response.json()["schemaVersion"] == "v1"
    assert health_response.status_code == status.HTTP_200_OK


def test_request_id_header_and_error_response_format() -> None:
    response = APIClient().get(
        "/api/media-items/not-a-uuid/",
        HTTP_X_REQUEST_ID="test-request-id",
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert response.headers["X-Request-ID"] == "test-request-id"
    payload = response.json()
    assert payload["error"]["status"] == status.HTTP_403_FORBIDDEN
    assert payload["error"]["requestId"] == "test-request-id"
    assert payload["error"]["message"]
