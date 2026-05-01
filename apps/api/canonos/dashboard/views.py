from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import DashboardSummarySerializer
from .services import build_dashboard_summary


class DashboardSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=DashboardSummarySerializer, summary="Get dashboard summary")
    def get(self, request):  # noqa: ANN001, ANN201
        serializer = DashboardSummarySerializer(build_dashboard_summary(request.user))
        return Response(serializer.data)
