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
    assert payload["endpoints"]["detox_rules"] == "/api/detox/rules/"
    assert payload["endpoints"]["canon_seasons"] == "/api/seasons/"
    assert payload["endpoints"]["adaptation_relations"] == "/api/adaptations/relations/"
    assert payload["endpoints"]["media_adaptation_map"] == "/api/media-items/{id}/adaptation-map/"
    assert {module["name"] for module in payload["mvp_modules"]} >= {
        "health",
        "auth",
        "library",
        "discovery",
        "narrative_dna",
        "candidates",
        "critic_council",
        "taste_evolution",
        "completion_detox",
        "personal_canon",
        "adaptation_intelligence",
        "tonight_mode",
    }


def test_openapi_schema_is_available_and_documents_api_roots_without_warning_names() -> None:
    response = APIClient().get(reverse("schema"), HTTP_ACCEPT="application/vnd.oai.openapi+json")

    assert response.status_code == status.HTTP_200_OK
    schema = response.data
    paths = schema["paths"]
    schemas = schema["components"]["schemas"]

    assert schema["info"]["title"] == "CanonOS API"
    assert "/api/" in paths
    assert "/api/v1/" in paths
    assert "/api/health/" in paths
    assert paths["/api/"]["get"]["operationId"] == "api_root_retrieve"
    assert paths["/api/v1/"]["get"]["operationId"] == "api_v1_root_retrieve"

    for enum_name in [
        "AdaptationExperienceOrderEnum",
        "CandidateDecisionEnum",
        "ConsumptionStatusEnum",
        "ExternalMetadataProviderEnum",
        "LowMediumHighEnum",
        "MediaTypeEnum",
        "TasteDirectionEnum",
    ]:
        assert enum_name in schemas

    for generated_warning_name in [
        "Decision7c9Enum",
        "Provider0deEnum",
        "Recommendation7c9Enum",
        "Recommendation7ffEnum",
        "StatusB64Enum",
    ]:
        assert generated_warning_name not in schemas


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
