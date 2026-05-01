from __future__ import annotations

from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import HealthCheckSerializer


class HealthCheckView(APIView):
    authentication_classes: list[type] = []
    permission_classes = [AllowAny]

    def get(self, request):  # noqa: ANN001, ANN201
        payload = {
            "status": "ok",
            "service": "canonos-api",
            "version": "0.1.0",
        }
        serializer = HealthCheckSerializer(payload)
        return Response(serializer.data)
