from __future__ import annotations

from django.db.models import Q
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import MediaItem
from .serializers import MediaItemSerializer


@extend_schema_view(
    list=extend_schema(
        parameters=[
            OpenApiParameter("mediaType", str, description="Filter by media type."),
            OpenApiParameter("status", str, description="Filter by consumption status."),
            OpenApiParameter(
                "search",
                str,
                description="Search title, original title, creator, or notes.",
            ),
        ],
        summary="List current user's media items",
    ),
    retrieve=extend_schema(summary="Get current user's media item"),
    create=extend_schema(summary="Create media item"),
    partial_update=extend_schema(summary="Update media item"),
    destroy=extend_schema(summary="Delete media item"),
)
class MediaItemViewSet(viewsets.ModelViewSet):
    serializer_class = MediaItemSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):  # noqa: ANN201
        queryset = (
            MediaItem.objects.filter(owner=self.request.user)
            .prefetch_related(
                "scores__taste_dimension",
            )
            .order_by(
                "-updated_at",
                "title",
            )
        )
        media_type = self.request.query_params.get("mediaType")
        status = self.request.query_params.get("status")
        search = self.request.query_params.get("search")

        if media_type:
            queryset = queryset.filter(media_type=media_type)
        if status:
            queryset = queryset.filter(status=status)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(original_title__icontains=search)
                | Q(creator__icontains=search)
                | Q(notes__icontains=search)
            )
        return queryset

    def perform_create(self, serializer: MediaItemSerializer) -> None:
        serializer.save(owner=self.request.user)
