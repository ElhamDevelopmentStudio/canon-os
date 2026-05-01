from __future__ import annotations

from drf_spectacular.utils import OpenApiExample, extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

API_ROOT_PAYLOAD = {
    "service": "canonos-api",
    "version": "0.1.0",
    "endpoints": {
        "health": "/api/health/",
        "auth": "/api/auth/",
        "settings": "/api/auth/settings/",
        "aftertaste": "/api/aftertaste/",
        "dashboard_summary": "/api/dashboard/summary/",
        "media_items": "/api/media-items/",
        "taste_dimensions": "/api/taste-dimensions/",
        "taste_profile": "/api/taste-profile/",
        "candidates": "/api/candidates/",
        "queue_items": "/api/queue-items/",
        "tonight_mode": "/api/queue/tonight/",
        "schema": "/api/schema/",
        "swagger_docs": "/api/docs/swagger/",
        "scalar_docs": "/api/docs/scalar/",
    },
    "mvp_modules": [
        {"name": "health", "status": "available", "path": "/api/health/"},
        {"name": "auth", "status": "available", "path": "/api/auth/me/"},
        {"name": "settings", "status": "available", "path": "/api/auth/settings/"},
        {"name": "aftertaste", "status": "available", "path": "/api/aftertaste/"},
        {"name": "dashboard", "status": "available", "path": "/api/dashboard/summary/"},
        {"name": "library", "status": "available", "path": "/api/media-items/"},
        {"name": "taste", "status": "available", "path": "/api/taste-dimensions/"},
        {"name": "taste_profile", "status": "available", "path": "/api/taste-profile/"},
        {"name": "candidates", "status": "available", "path": "/api/candidates/"},
        {"name": "queue", "status": "available", "path": "/api/queue-items/"},
        {"name": "tonight_mode", "status": "available", "path": "/api/queue/tonight/"},
    ],
}


class ApiRootView(APIView):
    authentication_classes: list[type] = []
    permission_classes = [AllowAny]

    @extend_schema(
        auth=[],
        description="List stable CanonOS MVP API entry points and documentation URLs.",
        examples=[
            OpenApiExample(
                "API root",
                value=API_ROOT_PAYLOAD,
                response_only=True,
            ),
        ],
        operation_id="api_root_retrieve",
        responses={200: dict},
        summary="CanonOS API root",
    )
    def get(self, request):  # noqa: ANN001, ANN201
        return Response(API_ROOT_PAYLOAD)
