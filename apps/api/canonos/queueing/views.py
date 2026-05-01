from __future__ import annotations

from django.db import transaction
from django.db.models import Max, Q
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import QueueItem
from .serializers import QueueItemSerializer, QueueReorderResponseSerializer, QueueReorderSerializer


@extend_schema_view(
    list=extend_schema(
        parameters=[
            OpenApiParameter("mediaType", str, description="Filter by media type."),
            OpenApiParameter("priority", str, description="Filter by queue priority."),
            OpenApiParameter("search", str, description="Search title, reason, or best mood."),
        ],
        summary="List current user's queue items",
    ),
    retrieve=extend_schema(summary="Get current user's queue item"),
    create=extend_schema(summary="Create queue item"),
    partial_update=extend_schema(summary="Update queue item"),
    destroy=extend_schema(summary="Delete queue item"),
)
class QueueItemViewSet(viewsets.ModelViewSet):
    serializer_class = QueueItemSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):  # noqa: ANN201
        queryset = QueueItem.objects.filter(owner=self.request.user).select_related(
            "candidate",
            "media_item",
        )
        media_type = self.request.query_params.get("mediaType")
        priority = self.request.query_params.get("priority")
        search = self.request.query_params.get("search")

        if media_type:
            queryset = queryset.filter(media_type=media_type)
        if priority:
            queryset = queryset.filter(priority=priority)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(reason__icontains=search)
                | Q(best_mood__icontains=search)
            )
        return queryset.order_by("queue_position", "-updated_at", "title")

    def perform_create(self, serializer: QueueItemSerializer) -> None:
        max_position = QueueItem.objects.filter(owner=self.request.user).aggregate(
            max_position=Max("queue_position")
        )["max_position"]
        serializer.save(owner=self.request.user, queue_position=(max_position or 0) + 1)

    @extend_schema(
        request=QueueReorderSerializer,
        responses={200: QueueReorderResponseSerializer},
        summary="Reorder queue items",
    )
    @action(detail=False, methods=["post"])
    def reorder(self, request):  # noqa: ANN001, ANN201
        serializer = QueueReorderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item_ids = serializer.validated_data["itemIds"]
        owned_items = list(QueueItem.objects.filter(owner=request.user))
        items = [item for item in owned_items if item.id in item_ids]
        if len(items) != len(item_ids):
            return Response(
                {"itemIds": ["All queue items must belong to the current user."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        item_by_id = {item.id: item for item in items}
        remaining_items = [
            item
            for item in sorted(
                owned_items,
                key=lambda queue_item: (
                    queue_item.queue_position,
                    queue_item.title.casefold(),
                    str(queue_item.id),
                ),
            )
            if item.id not in item_by_id
        ]
        ordered_items_to_save = [item_by_id[item_id] for item_id in item_ids] + remaining_items
        with transaction.atomic():
            for position, item in enumerate(ordered_items_to_save, start=1):
                item.queue_position = position
                item.save(update_fields=["queue_position", "updated_at"])

        ordered_items = QueueItem.objects.filter(owner=request.user).order_by(
            "queue_position",
            "-updated_at",
            "title",
        )
        return Response({"results": QueueItemSerializer(ordered_items, many=True).data})
