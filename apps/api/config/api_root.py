from __future__ import annotations

from drf_spectacular.utils import OpenApiExample, extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class ApiRootView(APIView):
    authentication_classes: list[type] = []
    permission_classes = [AllowAny]

    @extend_schema(
        auth=[],
        description="List stable CanonOS MVP API entry points and documentation URLs.",
        examples=[
            OpenApiExample(
                "API root",
                value={
                    "service": "canonos-api",
                    "version": "0.1.0",
                    "endpoints": {
                        "health": "/api/health/",
                        "auth": "/api/auth/",
                        "dashboard_summary": "/api/dashboard/summary/",
                        "media_items": "/api/media-items/",
                        "taste_dimensions": "/api/taste-dimensions/",
                        "candidates": "/api/candidates/",
                        "schema": "/api/schema/",
                        "swagger_docs": "/api/docs/swagger/",
                        "scalar_docs": "/api/docs/scalar/",
                    },
                    "mvp_modules": [
                        {"name": "health", "status": "available", "path": "/api/health/"},
                        {"name": "auth", "status": "available", "path": "/api/auth/me/"},
                        {
                            "name": "dashboard",
                            "status": "available",
                            "path": "/api/dashboard/summary/",
                        },
                        {"name": "library", "status": "available", "path": "/api/media-items/"},
                        {"name": "taste", "status": "available", "path": "/api/taste-dimensions/"},
                        {"name": "candidates", "status": "available", "path": "/api/candidates/"},
                        {"name": "tonight_mode", "status": "planned", "path": None},
                    ],
                },
                response_only=True,
            ),
        ],
        operation_id="api_root_retrieve",
        responses={200: dict},
        summary="CanonOS API root",
    )
    def get(self, request):  # noqa: ANN001, ANN201
        return Response(
            {
                "service": "canonos-api",
                "version": "0.1.0",
                "endpoints": {
                    "health": "/api/health/",
                    "auth": "/api/auth/",
                    "dashboard_summary": "/api/dashboard/summary/",
                    "media_items": "/api/media-items/",
                    "taste_dimensions": "/api/taste-dimensions/",
                    "candidates": "/api/candidates/",
                    "schema": "/api/schema/",
                    "swagger_docs": "/api/docs/swagger/",
                    "scalar_docs": "/api/docs/scalar/",
                },
                "mvp_modules": [
                    {"name": "health", "status": "available", "path": "/api/health/"},
                    {"name": "auth", "status": "available", "path": "/api/auth/me/"},
                    {
                        "name": "dashboard",
                        "status": "available",
                        "path": "/api/dashboard/summary/",
                    },
                    {"name": "library", "status": "available", "path": "/api/media-items/"},
                    {"name": "taste", "status": "available", "path": "/api/taste-dimensions/"},
                    {"name": "candidates", "status": "available", "path": "/api/candidates/"},
                    {"name": "tonight_mode", "status": "planned", "path": None},
                ],
            }
        )
