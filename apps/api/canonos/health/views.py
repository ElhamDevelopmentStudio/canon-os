from __future__ import annotations

import logging

from django.core.cache import cache
from django.db import connection
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from config.celery import app as celery_app

from .serializers import DependencyHealthCheckSerializer, HealthCheckSerializer
from .tasks import celery_ping

CELERY_HEALTH_TASK_NAME = "canonos.health.celery_ping"

logger = logging.getLogger(__name__)


class HealthCheckView(APIView):
    authentication_classes: list[type] = []
    permission_classes = [AllowAny]

    @extend_schema(
        auth=[],
        responses=HealthCheckSerializer,
        summary="Check API health",
        description="Return service name, version, and uptime status.",
    )
    def get(self, request):  # noqa: ANN001, ANN201
        payload = {
            "status": "ok",
            "service": "canonos-api",
            "version": "0.1.0",
        }
        serializer = HealthCheckSerializer(payload)
        return Response(serializer.data)


class DatabaseHealthCheckView(APIView):
    authentication_classes: list[type] = []
    permission_classes = [AllowAny]

    @extend_schema(
        auth=[],
        responses={200: DependencyHealthCheckSerializer, 503: DependencyHealthCheckSerializer},
        summary="Check database health",
        description=(
            "Run a lightweight database query to confirm that Django can reach the "
            "configured database."
        ),
    )
    def get(self, request):  # noqa: ANN001, ANN201
        try:
            with connection.cursor() as cursor:
                cursor.execute("select 1")
                cursor.fetchone()
        except Exception as exc:  # pragma: no cover - exercised by deployment smoke checks
            return _dependency_response(
                "database",
                "unavailable",
                str(exc),
                status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return _dependency_response("database", "ok", f"Connected via {connection.vendor}.")


class RedisHealthCheckView(APIView):
    authentication_classes: list[type] = []
    permission_classes = [AllowAny]

    @extend_schema(
        auth=[],
        responses={200: DependencyHealthCheckSerializer, 503: DependencyHealthCheckSerializer},
        summary="Check Redis health",
        description="Write and read a short-lived cache key to confirm Redis/cache reachability.",
    )
    def get(self, request):  # noqa: ANN001, ANN201
        cache_key = "canonos:health:redis"
        try:
            cache.set(cache_key, "ok", timeout=10)
            if cache.get(cache_key) != "ok":
                raise RuntimeError("Cache read did not return the written sentinel value.")
            cache.delete(cache_key)
        except Exception as exc:  # pragma: no cover - exercised by deployment smoke checks
            return _dependency_response(
                "redis",
                "unavailable",
                str(exc),
                status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return _dependency_response("redis", "ok", "Cache round-trip succeeded.")


class CeleryHealthCheckView(APIView):
    authentication_classes: list[type] = []
    permission_classes = [AllowAny]

    @extend_schema(
        auth=[],
        responses={200: DependencyHealthCheckSerializer, 503: DependencyHealthCheckSerializer},
        summary="Check Celery worker health",
        description=(
            "Dispatch a tiny Celery ping task and wait briefly for a worker/result "
            "backend response."
        ),
    )
    def get(self, request):  # noqa: ANN001, ANN201
        try:
            if celery_app.conf.task_always_eager:
                payload = celery_ping.apply().get()
            else:
                result = celery_app.send_task(CELERY_HEALTH_TASK_NAME, queue="health")
                payload = result.get(timeout=5)
            if payload.get("status") != "ok":
                raise RuntimeError("Celery ping returned an unexpected payload.")
        except Exception as exc:  # pragma: no cover - depends on live worker availability
            logger.exception("Celery health check failed.")
            return _dependency_response(
                "celery",
                "unavailable",
                str(exc),
                status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return _dependency_response("celery", "ok", "Celery ping task completed.")


def _dependency_response(
    dependency: str,
    health_status: str,
    detail: str,
    response_status: int = status.HTTP_200_OK,
) -> Response:
    serializer = DependencyHealthCheckSerializer(
        {
            "status": health_status,
            "service": "canonos-api",
            "dependency": dependency,
            "detail": detail,
        }
    )
    return Response(serializer.data, status=response_status)
