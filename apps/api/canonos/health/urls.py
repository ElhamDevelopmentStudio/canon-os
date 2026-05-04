from __future__ import annotations

from django.urls import path

from .views import (
    CeleryHealthCheckView,
    DatabaseHealthCheckView,
    HealthCheckView,
    RedisHealthCheckView,
)

urlpatterns = [
    path("", HealthCheckView.as_view(), name="health-check"),
    path("db/", DatabaseHealthCheckView.as_view(), name="health-check-db"),
    path("redis/", RedisHealthCheckView.as_view(), name="health-check-redis"),
    path("celery/", CeleryHealthCheckView.as_view(), name="health-check-celery"),
]
