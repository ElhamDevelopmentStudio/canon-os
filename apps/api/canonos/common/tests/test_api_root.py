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
    assert {module["name"] for module in payload["mvp_modules"]} >= {
        "health",
        "auth",
        "library",
        "candidates",
        "tonight_mode",
    }


def test_openapi_schema_is_available_and_documents_api_root() -> None:
    response = APIClient().get(reverse("schema"))

    assert response.status_code == status.HTTP_200_OK
    content = response.content.decode()
    assert "CanonOS API" in content
    assert "/api/" in content
    assert "/api/health/" in content
