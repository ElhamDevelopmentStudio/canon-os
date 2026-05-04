from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from canonos.common.cache import cache_user_payload

from .serializers import DashboardSummarySerializer
from .services import build_dashboard_summary


class DashboardSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses=DashboardSummarySerializer,
        summary="Get dashboard summary",
        description="Return private dashboard metrics and current taste signals.",
    )
    def get(self, request):  # noqa: ANN001, ANN201
        payload = cache_user_payload(
            request.user,
            "dashboard-summary",
            lambda: build_dashboard_summary(request.user),
        )
        serializer = DashboardSummarySerializer(payload)
        return Response(serializer.data)
