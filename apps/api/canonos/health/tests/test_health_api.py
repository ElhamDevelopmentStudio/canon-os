from __future__ import annotations

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient


def test_health_endpoint_returns_service_status() -> None:
    response = APIClient().get(reverse("health-check"))

    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {
        "status": "ok",
        "service": "canonos-api",
        "version": "0.1.0",
    }
