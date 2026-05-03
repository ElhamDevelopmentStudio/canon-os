from __future__ import annotations

from django.db import transaction
from django.db.models import Max, Q
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from canonos.accounts.models import UserSettings

from .models import QueueItem, TonightModeSession
from .serializers import (
    QueueItemSerializer,
    QueueRecalculateResponseSerializer,
    QueueReorderResponseSerializer,
    QueueReorderSerializer,
    TonightModeRequestSerializer,
    TonightModeResponseSerializer,
    TonightModeSessionSerializer,
)


@extend_schema_view(
    list=extend_schema(
        parameters=[
            OpenApiParameter("mediaType", str, description="Filter by media type."),
            OpenApiParameter("priority", str, description="Filter by queue priority."),
            OpenApiParameter("isArchived", bool, description="Filter archived queue items."),
            OpenApiParameter("search", str, description="Search title, reason, or best mood."),
        ],
        summary="List current user's queue items",
        description="List owner-scoped queue items with filters and search.",
    ),
    retrieve=extend_schema(
        summary="Get current user's queue item", description="Fetch one owner-scoped queue item."
    ),
    create=extend_schema(
        summary="Create queue item",
        description="Create a queue item directly or from a linked media item/candidate.",
    ),
    partial_update=extend_schema(
        summary="Update queue item",
        description="Patch queue title, priority, timing, reason, and linked item fields.",
    ),
    destroy=extend_schema(
        summary="Delete queue item", description="Remove one owner-scoped queue item."
    ),
)
class QueueItemViewSet(viewsets.ModelViewSet):
    queryset = QueueItem.objects.none()
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
        archived = self.request.query_params.get("isArchived")
        search = self.request.query_params.get("search")

        if media_type:
            queryset = queryset.filter(media_type=media_type)
        if priority:
            queryset = queryset.filter(priority=priority)
        if archived is not None:
            queryset = queryset.filter(is_archived=archived.casefold() in {"1", "true", "yes"})
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
        description="Persist a user-owned queue order from an ordered list of queue item IDs.",
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
            "is_archived",
            "queue_position",
            "-updated_at",
            "title",
        )
        return Response({"results": QueueItemSerializer(ordered_items, many=True).data})

    @extend_schema(
        responses={200: QueueRecalculateResponseSerializer},
        summary="Recalculate adaptive queue priority",
        description=(
            "Re-score current user's queue items with mood compatibility, intensity, "
            "complexity, commitment, freshness decay, and low-priority archive behavior."
        ),
    )
    @action(detail=False, methods=["post"])
    def recalculate(self, request):  # noqa: ANN001, ANN201
        from .services import recalculate_queue_for_user

        result = recalculate_queue_for_user(request.user)
        payload = {
            "results": QueueItemSerializer(result.items, many=True).data,
            "scores": [
                {
                    "itemId": score.item_id,
                    "score": score.score,
                    "freshnessScore": score.freshness_score,
                    "priority": score.priority,
                    "isArchived": score.is_archived,
                    "reason": score.reason,
                }
                for score in result.scores
            ],
            "summary": {
                "activeCount": result.active_count,
                "archivedCount": result.archived_count,
                "averageScore": result.average_score,
                "topInsight": result.top_insight,
                "fatigueWarnings": result.fatigue_warnings,
            },
        }
        return Response(payload)


class TonightModeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=TonightModeRequestSerializer,
        responses={201: TonightModeResponseSerializer},
        summary="Generate Tonight Mode recommendations",
        description="Generate recommendations from queue, planned media, and settings.",
    )
    def post(self, request):  # noqa: ANN001, ANN201
        from .services import TonightContext, generate_tonight_recommendations

        serializer = TonightModeRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user_settings, _ = UserSettings.objects.get_or_create(user=request.user)
        context_data = {
            **serializer.validated_data,
            "preferred_media_types": serializer.validated_data.get(
                "preferred_media_types", user_settings.default_media_types
            ),
            "risk_tolerance": serializer.validated_data.get(
                "risk_tolerance", user_settings.default_risk_tolerance
            ),
        }
        context = TonightContext(**context_data)
        recommendations = generate_tonight_recommendations(request.user, context)
        session = TonightModeSession.objects.create(
            owner=request.user,
            available_minutes=context.available_minutes,
            energy_level=context.energy_level,
            focus_level=context.focus_level,
            desired_effect=context.desired_effect,
            preferred_media_types=context.preferred_media_types,
            risk_tolerance=context.risk_tolerance,
            generated_recommendations=recommendations,
        )
        payload = {
            "session": TonightModeSessionSerializer(session).data,
            "recommendations": recommendations,
            "safeChoice": _choice_for_slot(recommendations, "safe"),
            "challengingChoice": _choice_for_slot(recommendations, "challenging"),
            "wildcardChoice": _choice_for_slot(recommendations, "wildcard"),
        }
        return Response(payload, status=status.HTTP_201_CREATED)


def _choice_for_slot(
    recommendations: list[dict[str, object]], slot: str
) -> dict[str, object] | None:
    return next(
        (recommendation for recommendation in recommendations if recommendation["slot"] == slot),
        None,
    )
