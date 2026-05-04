from __future__ import annotations

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from config.celery import app as celery_app


def test_health_endpoint_returns_service_status() -> None:
    response = APIClient().get(reverse("health-check"))

    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {
        "status": "ok",
        "service": "canonos-api",
        "version": "0.1.0",
    }


@pytest.mark.django_db
def test_database_health_endpoint_runs_query() -> None:
    response = APIClient().get(reverse("health-check-db"))

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["status"] == "ok"
    assert response.json()["dependency"] == "database"


def test_redis_health_endpoint_runs_cache_roundtrip(settings) -> None:  # noqa: ANN001
    settings.CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "health-test-cache",
        }
    }

    response = APIClient().get(reverse("health-check-redis"))

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["status"] == "ok"
    assert response.json()["dependency"] == "redis"


def test_celery_health_endpoint_runs_ping_task() -> None:
    original_task_always_eager = celery_app.conf.task_always_eager
    celery_app.conf.update(CELERY_TASK_ALWAYS_EAGER=True)

    try:
        response = APIClient().get(reverse("health-check-celery"))
    finally:
        celery_app.conf.update(CELERY_TASK_ALWAYS_EAGER=original_task_always_eager)

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["status"] == "ok"
    assert response.json()["dependency"] == "celery"
