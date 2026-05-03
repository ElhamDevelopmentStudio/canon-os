from __future__ import annotations

from django.db import transaction
from django.db.models import Max, Prefetch, Q
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CanonSeason, CanonSeasonItem
from .serializers import (
    CanonSeasonItemReorderResponseSerializer,
    CanonSeasonItemReorderSerializer,
    CanonSeasonItemSerializer,
    CanonSeasonSerializer,
)


@extend_schema_view(
    list=extend_schema(
        parameters=[
            OpenApiParameter("theme", str, description="Filter by canon season theme."),
            OpenApiParameter("status", str, description="Filter by season status."),
            OpenApiParameter("search", str, description="Search title, theme, and description."),
        ],
        summary="List current user's canon seasons",
        description="List owner-scoped personal canon seasons with progress and ordered items.",
    ),
    retrieve=extend_schema(
        summary="Get current user's canon season",
        description="Fetch one owner-scoped canon season with ordered items and prompts.",
    ),
    create=extend_schema(
        summary="Create canon season",
        description="Create a themed Personal Canon exploration season.",
    ),
    partial_update=extend_schema(
        summary="Update canon season",
        description="Patch season title, theme, status, dates, description, or reflection notes.",
    ),
    destroy=extend_schema(
        summary="Delete canon season",
        description="Remove an owner-scoped canon season and its ordered items.",
    ),
)
class CanonSeasonViewSet(viewsets.ModelViewSet):
    queryset = CanonSeason.objects.none()
    serializer_class = CanonSeasonSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):  # noqa: ANN201
        item_queryset = CanonSeasonItem.objects.order_by("order", "created_at", "title_snapshot")
        queryset = CanonSeason.objects.filter(owner=self.request.user).prefetch_related(
            Prefetch("items", queryset=item_queryset),
        )
        theme = self.request.query_params.get("theme")
        status_value = self.request.query_params.get("status")
        search = self.request.query_params.get("search")

        if theme:
            queryset = queryset.filter(theme=theme)
        if status_value:
            queryset = queryset.filter(status=status_value)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(theme__icontains=search)
                | Q(description__icontains=search)
            )
        return queryset.order_by("-updated_at", "title")

    def perform_create(self, serializer: CanonSeasonSerializer) -> None:
        serializer.save(owner=self.request.user)

    @extend_schema(
        request=CanonSeasonItemSerializer,
        responses={201: CanonSeasonItemSerializer},
        summary="Add item to canon season",
        description=(
            "Add a custom, media-linked, or candidate-linked item to an owner-scoped season."
        ),
    )
    @action(detail=True, methods=["post"], url_path="items")
    def add_item(self, request, pk=None):  # noqa: ANN001, ANN201
        season = self.get_object()
        serializer = CanonSeasonItemSerializer(
            data=request.data,
            context={"request": request, "season": season},
        )
        serializer.is_valid(raise_exception=True)
        max_order = season.items.aggregate(max_order=Max("order"))["max_order"]
        item_order = serializer.validated_data.get("order") or (max_order or 0) + 1
        item = serializer.save(season=season, order=item_order)
        season.save(update_fields=["updated_at"])
        return Response(CanonSeasonItemSerializer(item).data, status=status.HTTP_201_CREATED)

    @extend_schema(
        request=CanonSeasonItemReorderSerializer,
        responses={200: CanonSeasonItemReorderResponseSerializer},
        summary="Reorder canon season items",
        description="Persist an ordered list of item IDs for one owner-scoped season.",
    )
    @action(detail=True, methods=["post"], url_path="items/reorder")
    def reorder_items(self, request, pk=None):  # noqa: ANN001, ANN201
        season = self.get_object()
        serializer = CanonSeasonItemReorderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item_ids = serializer.validated_data["itemIds"]
        owned_items = list(season.items.all())
        items = [item for item in owned_items if item.id in item_ids]
        if len(items) != len(item_ids):
            return Response(
                {"itemIds": ["All canon season items must belong to this season."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        item_by_id = {item.id: item for item in items}
        remaining_items = [
            item
            for item in sorted(
                owned_items,
                key=lambda season_item: (
                    season_item.order,
                    season_item.title_snapshot.casefold(),
                    str(season_item.id),
                ),
            )
            if item.id not in item_by_id
        ]
        ordered_items = [item_by_id[item_id] for item_id in item_ids] + remaining_items
        with transaction.atomic():
            for position, item in enumerate(ordered_items, start=1):
                item.order = position
                item.save(update_fields=["order", "updated_at"])
            season.save(update_fields=["updated_at"])

        refreshed_items = season.items.order_by("order", "created_at", "title_snapshot")
        season.refresh_from_db()
        return Response(
            {
                "results": CanonSeasonItemSerializer(refreshed_items, many=True).data,
                "season": CanonSeasonSerializer(season).data,
            },
        )


class CanonSeasonItemDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_item(self, request, season_id, item_id):  # noqa: ANN001, ANN201
        return get_object_or_404(
            CanonSeasonItem.objects.select_related("season"),
            season__owner=request.user,
            season_id=season_id,
            id=item_id,
        )

    @extend_schema(
        request=CanonSeasonItemSerializer,
        responses={200: CanonSeasonItemSerializer},
        summary="Update canon season item",
        description="Patch notes, order, source, completion status, or canon status.",
    )
    def patch(self, request, season_id, item_id):  # noqa: ANN001, ANN201
        item = self.get_item(request, season_id, item_id)
        serializer = CanonSeasonItemSerializer(
            item,
            data=request.data,
            partial=True,
            context={"request": request, "season": item.season},
        )
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        updated.season.save(update_fields=["updated_at"])
        return Response(CanonSeasonItemSerializer(updated).data)

    @extend_schema(
        responses={204: None},
        summary="Delete canon season item",
        description="Remove one owner-scoped item from a canon season.",
    )
    def delete(self, request, season_id, item_id):  # noqa: ANN001, ANN201
        item = self.get_item(request, season_id, item_id)
        season = item.season
        item.delete()
        _compact_item_order(season)
        season.save(update_fields=["updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


def _compact_item_order(season: CanonSeason) -> None:
    for position, item in enumerate(season.items.order_by("order", "created_at"), start=1):
        if item.order != position:
            item.order = position
            item.save(update_fields=["order", "updated_at"])
