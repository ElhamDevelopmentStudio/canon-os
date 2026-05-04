from __future__ import annotations

import os

import pytest
from django.core.cache import cache
from django.db import connection

pytestmark = pytest.mark.e2e


@pytest.mark.django_db
def test_database_connection_uses_configured_postgres() -> None:
    database_url = os.environ.get("DATABASE_URL", "")
    assert "postgresql://" in database_url, "E2E must run against PostgreSQL via DATABASE_URL."
    assert connection.vendor == "postgresql"

    with connection.cursor() as cursor:
        cursor.execute("select current_database(), current_user")
        database_name, user_name = cursor.fetchone()

    assert database_name in {"canonos", "test_canonos"} or database_name.startswith("test_")
    assert user_name == "canonos"


def test_redis_cache_uses_configured_service() -> None:
    redis_url = os.environ.get("REDIS_URL", "")
    assert redis_url.startswith("redis://"), "E2E must run against Redis via REDIS_URL."

    cache_key = "canonos:e2e:redis"
    cache.set(cache_key, "ok", timeout=30)

    assert cache.get(cache_key) == "ok"


@pytest.mark.django_db
def test_dependency_health_endpoints_report_live_services(client) -> None:  # noqa: ANN001
    for path, dependency in [
        ("/api/health/db/", "database"),
        ("/api/health/redis/", "redis"),
    ]:
        response = client.get(path)

        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "ok"
        assert payload["dependency"] == dependency
