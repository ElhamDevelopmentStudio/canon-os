from __future__ import annotations

from django.db.models import Q, QuerySet
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from canonos.media.models import MediaItem

from .models import AdaptationRelation
from .serializers import AdaptationPathSerializer, AdaptationRelationSerializer
from .services import build_adaptation_path


@extend_schema_view(
    list=extend_schema(
        parameters=[
            OpenApiParameter(
                "mediaItemId",
                str,
                description="Filter relations involving a media item.",
            ),
            OpenApiParameter("sourceMediaItemId", str, description="Filter by source media item."),
            OpenApiParameter(
                "adaptationMediaItemId",
                str,
                description="Filter by adaptation media item.",
            ),
            OpenApiParameter(
                "relationType",
                str,
                description="Filter by adaptation relation type.",
            ),
        ],
        summary="List adaptation relations",
        description="List owner-scoped source/adaptation relations with optional media filters.",
    ),
    retrieve=extend_schema(
        summary="Get adaptation relation",
        description="Fetch one owner-scoped source/adaptation relation.",
    ),
    create=extend_schema(
        summary="Create adaptation relation",
        description="Connect source material and an adaptation with comparison scores and notes.",
    ),
    partial_update=extend_schema(
        summary="Update adaptation relation",
        description="Patch comparison scores, relation metadata, notes, or recommended order.",
    ),
    destroy=extend_schema(
        summary="Delete adaptation relation",
        description="Delete one owner-scoped source/adaptation relation.",
    ),
)
class AdaptationRelationViewSet(viewsets.ModelViewSet):
    queryset = AdaptationRelation.objects.none()
    serializer_class = AdaptationRelationSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self) -> QuerySet[AdaptationRelation]:
        queryset = AdaptationRelation.objects.filter(owner=self.request.user).select_related(
            "source_media_item",
            "adaptation_media_item",
        )
        media_item_id = self.request.query_params.get("mediaItemId")
        source_media_item_id = self.request.query_params.get("sourceMediaItemId")
        adaptation_media_item_id = self.request.query_params.get("adaptationMediaItemId")
        relation_type = self.request.query_params.get("relationType")

        if media_item_id:
            queryset = queryset.filter(
                Q(source_media_item_id=media_item_id) | Q(adaptation_media_item_id=media_item_id)
            )
        if source_media_item_id:
            queryset = queryset.filter(source_media_item_id=source_media_item_id)
        if adaptation_media_item_id:
            queryset = queryset.filter(adaptation_media_item_id=adaptation_media_item_id)
        if relation_type:
            queryset = queryset.filter(relation_type=relation_type)
        return queryset.order_by("-updated_at", "source_media_item__title")

    def perform_create(self, serializer: AdaptationRelationSerializer) -> None:
        serializer.save(owner=self.request.user)


class MediaAdaptationMapView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AdaptationPathSerializer

    def get_media_item(self, media_id: str) -> MediaItem:
        return get_object_or_404(MediaItem, owner=self.request.user, id=media_id)

    def get_relations(self, media_item: MediaItem) -> list[AdaptationRelation]:
        return list(
            AdaptationRelation.objects.filter(owner=self.request.user)
            .filter(Q(source_media_item=media_item) | Q(adaptation_media_item=media_item))
            .select_related("source_media_item", "adaptation_media_item")
            .order_by("-updated_at", "source_media_item__title")
        )

    @extend_schema(
        responses={200: AdaptationPathSerializer},
        summary="Get adaptation map",
        description=(
            "Return owner-scoped relations and current best experience path recommendation."
        ),
    )
    def get(self, request, media_id: str) -> Response:  # noqa: ANN001
        media_item = self.get_media_item(media_id)
        path = build_adaptation_path(media_item, self.get_relations(media_item))
        return Response(AdaptationPathSerializer(path, context={"request": request}).data)

    @extend_schema(
        responses={200: AdaptationPathSerializer},
        summary="Generate adaptation experience path",
        description="Recalculate the best read/watch/listen/skip recommendation for a media item.",
    )
    def post(self, request, media_id: str) -> Response:  # noqa: ANN001
        media_item = self.get_media_item(media_id)
        path = build_adaptation_path(media_item, self.get_relations(media_item))
        return Response(
            AdaptationPathSerializer(path, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )
