from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import TasteEvolutionSnapshot
from .serializers import (
    TasteEvolutionGenerateSerializer,
    TasteEvolutionSnapshotSerializer,
    TasteEvolutionTimelineSerializer,
)
from .services import generate_evolution_snapshot


class TasteEvolutionTimelineView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses=TasteEvolutionTimelineSerializer,
        summary="List taste evolution snapshots",
        description="Return the authenticated user's taste evolution snapshot timeline.",
    )
    def get(self, request):  # noqa: ANN001, ANN201
        snapshots = TasteEvolutionSnapshot.objects.filter(owner=request.user)
        serializer = TasteEvolutionSnapshotSerializer(snapshots, many=True)
        return Response(
            {
                "count": snapshots.count(),
                "next": None,
                "previous": None,
                "results": serializer.data,
            }
        )


class TasteEvolutionGenerateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=TasteEvolutionGenerateSerializer,
        responses={201: TasteEvolutionSnapshotSerializer},
        summary="Generate taste evolution snapshot",
        description=(
            "Compute and persist an evidence-based taste evolution snapshot for the "
            "authenticated user."
        ),
    )
    def post(self, request):  # noqa: ANN001, ANN201
        serializer = TasteEvolutionGenerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        snapshot = generate_evolution_snapshot(
            request.user,
            snapshot_period=serializer.validated_data.get(
                "snapshotPeriod",
                TasteEvolutionSnapshot.SnapshotPeriod.MONTHLY,
            ),
            snapshot_date=serializer.validated_data.get("snapshotDate"),
        )
        response_serializer = TasteEvolutionSnapshotSerializer(snapshot)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
