from __future__ import annotations

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from canonos.common.throttles import ExpensiveEndpointThrottle
from canonos.media.models import MediaItem

from .models import NarrativeAnalysis
from .serializers import (
    NarrativeAnalysisListSerializer,
    NarrativeAnalysisRequestSerializer,
    NarrativeAnalysisSerializer,
)
from .services import latest_analysis_for_media, request_narrative_analysis


@extend_schema_view(
    list=extend_schema(
        parameters=[OpenApiParameter("mediaItemId", str, description="Filter by media item ID.")],
        responses=NarrativeAnalysisListSerializer,
        summary="List Narrative DNA analyses",
        description="List owner-scoped Narrative DNA analysis records.",
    ),
    retrieve=extend_schema(
        responses=NarrativeAnalysisSerializer,
        summary="Get Narrative DNA analysis",
        description="Fetch one owner-scoped Narrative DNA analysis by ID.",
    ),
    partial_update=extend_schema(
        request=NarrativeAnalysisSerializer,
        responses=NarrativeAnalysisSerializer,
        summary="Correct Narrative DNA analysis",
        description="Apply user corrections to scores, summary, or evidence notes.",
    ),
)
class NarrativeAnalysisViewSet(viewsets.ModelViewSet):
    queryset = NarrativeAnalysis.objects.none()
    serializer_class = NarrativeAnalysisSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):  # noqa: ANN201
        queryset = NarrativeAnalysis.objects.filter(owner=self.request.user).select_related(
            "media_item"
        )
        media_item_id = self.request.query_params.get("mediaItemId")
        if media_item_id:
            queryset = queryset.filter(media_item_id=media_item_id)
        return queryset.order_by("-updated_at")


class MediaNarrativeAnalysisView(APIView):
    permission_classes = [IsAuthenticated]

    def get_throttles(self):  # noqa: ANN201
        if self.request.method == "POST":
            return [ExpensiveEndpointThrottle()]
        return super().get_throttles()

    @extend_schema(
        responses={200: NarrativeAnalysisSerializer, 404: dict},
        summary="Get media Narrative DNA",
        description="Fetch the latest Narrative DNA analysis for one owner-scoped media item.",
    )
    def get(self, request, media_id: str):  # noqa: ANN001, ANN201
        get_object_or_404(MediaItem, owner=request.user, id=media_id)
        analysis = latest_analysis_for_media(owner=request.user, media_item_id=media_id)
        if analysis is None:
            return Response(
                {"detail": "Narrative DNA analysis has not been requested for this media item."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(NarrativeAnalysisSerializer(analysis).data)

    @extend_schema(
        request=NarrativeAnalysisRequestSerializer,
        responses={201: NarrativeAnalysisSerializer},
        summary="Request media Narrative DNA analysis",
        description=(
            "Generate or refresh Narrative DNA from user-owned notes and metadata. "
            "The local heuristic runs synchronously; Celery task mirrors the same service."
        ),
    )
    def post(self, request, media_id: str):  # noqa: ANN001, ANN201
        media_item = get_object_or_404(MediaItem, owner=request.user, id=media_id)
        serializer = NarrativeAnalysisRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data
        analysis = request_narrative_analysis(
            owner=request.user,
            media_item=media_item,
            manual_notes=payload.get("manualNotes", ""),
            provider_key=payload.get("provider"),
            force_refresh=payload.get("forceRefresh", False),
        )
        return Response(NarrativeAnalysisSerializer(analysis).data, status=status.HTTP_201_CREATED)
