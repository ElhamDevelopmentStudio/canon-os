from __future__ import annotations

from django.db import transaction
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from canonos.common.cache import cache_user_payload, invalidate_user_data_cache
from canonos.media.models import MediaItem

from .models import MediaScore, TasteDimension
from .serializers import (
    MediaScoresBulkUpsertSerializer,
    MediaScoreSerializer,
    TasteDimensionSerializer,
    TasteProfileSummarySerializer,
)
from .services import build_taste_profile_summary, seed_default_taste_dimensions


class TasteDimensionListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses=TasteDimensionSerializer(many=True),
        summary="List taste dimensions",
        description="Ensure and return the scorecard dimensions for media scoring.",
    )
    def get(self, request):  # noqa: ANN001, ANN201
        seed_default_taste_dimensions(request.user)
        dimensions = TasteDimension.objects.filter(owner=request.user).order_by("name")
        return Response(TasteDimensionSerializer(dimensions, many=True).data)


class MediaScoresView(APIView):
    permission_classes = [IsAuthenticated]

    def get_media_item(self, request, media_id):  # noqa: ANN001, ANN201
        return get_object_or_404(MediaItem, id=media_id, owner=request.user)

    @extend_schema(
        responses=MediaScoreSerializer(many=True),
        summary="List media scores",
        description="Return all dimensional taste scores for one owner-scoped media item.",
    )
    def get(self, request, media_id):  # noqa: ANN001, ANN201
        media_item = self.get_media_item(request, media_id)
        scores = MediaScore.objects.filter(media_item=media_item).select_related("taste_dimension")
        return Response({"results": MediaScoreSerializer(scores, many=True).data})

    @extend_schema(
        request=MediaScoresBulkUpsertSerializer,
        responses=MediaScoreSerializer(many=True),
        summary="Bulk upsert media scores",
        description="Bulk create, update, or delete dimensional scores.",
    )
    @transaction.atomic
    def put(self, request, media_id):  # noqa: ANN001, ANN201
        media_item = self.get_media_item(request, media_id)
        seed_default_taste_dimensions(request.user)
        serializer = MediaScoresBulkUpsertSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        for item in serializer.validated_data["scores"]:
            dimension = get_object_or_404(
                TasteDimension,
                id=item["dimensionId"],
                owner=request.user,
            )
            if item["score"] is None:
                MediaScore.objects.filter(media_item=media_item, taste_dimension=dimension).delete()
                continue
            MediaScore.objects.update_or_create(
                media_item=media_item,
                taste_dimension=dimension,
                defaults={"score": item["score"], "note": item.get("note", "")},
            )

        invalidate_user_data_cache(request.user)
        scores = MediaScore.objects.filter(media_item=media_item).select_related("taste_dimension")
        return Response(
            {"results": MediaScoreSerializer(scores, many=True).data},
            status=status.HTTP_200_OK,
        )


class TasteProfileSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses=TasteProfileSummarySerializer,
        summary="Get current user's Taste Profile summary",
        description="Build the deterministic Taste Profile summary from evidence.",
    )
    def get(self, request):  # noqa: ANN001, ANN201
        return Response(
            cache_user_payload(
                request.user,
                "taste-profile-summary",
                lambda: build_taste_profile_summary(request.user),
            )
        )
