from __future__ import annotations

from datetime import date
from decimal import Decimal, InvalidOperation

from django.db.models import Prefetch, Q, QuerySet
from django.utils.dateparse import parse_date
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from canonos.aftertaste.models import AftertasteEntry
from canonos.common.cache import invalidate_user_data_cache
from canonos.metadata.models import ExternalMetadata
from canonos.taste.models import MediaScore

from .models import MediaItem
from .serializers import MediaItemSerializer


@extend_schema_view(
    list=extend_schema(
        parameters=[
            OpenApiParameter("mediaType", str, description="Filter by media type."),
            OpenApiParameter("status", str, description="Filter by consumption status."),
            OpenApiParameter("creator", str, description="Filter by creator/director/author."),
            OpenApiParameter("ratingMin", float, description="Minimum personal rating."),
            OpenApiParameter("ratingMax", float, description="Maximum personal rating."),
            OpenApiParameter("genericnessMin", float, description="Minimum Genericness score."),
            OpenApiParameter("genericnessMax", float, description="Maximum Genericness score."),
            OpenApiParameter("regretMin", float, description="Minimum Regret score."),
            OpenApiParameter("regretMax", float, description="Maximum Regret score."),
            OpenApiParameter(
                "completedFrom",
                str,
                description="Earliest completed date, YYYY-MM-DD.",
            ),
            OpenApiParameter("completedTo", str, description="Latest completed date, YYYY-MM-DD."),
            OpenApiParameter(
                "search",
                str,
                description="Search title, original title, creator, or notes.",
            ),
        ],
        summary="List current user's media items",
        description="List owner-scoped media with filters and search.",
    ),
    retrieve=extend_schema(
        summary="Get current user's media item",
        description="Fetch one media item with scores and latest aftertaste.",
    ),
    create=extend_schema(
        summary="Create media item",
        description="Create a media library item owned by the authenticated user.",
    ),
    partial_update=extend_schema(
        summary="Update media item",
        description="Patch editable media metadata, status, rating, notes, and consumption fields.",
    ),
    destroy=extend_schema(
        summary="Delete media item",
        description="Delete one media item and dependent score/aftertaste records.",
    ),
)
class MediaItemViewSet(viewsets.ModelViewSet):
    queryset = MediaItem.objects.none()
    serializer_class = MediaItemSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):  # noqa: ANN201
        queryset = MediaItem.objects.filter(owner=self.request.user).prefetch_related(
            Prefetch(
                "scores",
                queryset=MediaScore.objects.select_related("taste_dimension").order_by(
                    "taste_dimension__name"
                ),
                to_attr="prefetched_scores",
            ),
            Prefetch(
                "aftertaste_entries",
                queryset=AftertasteEntry.objects.select_related("media_item").order_by(
                    "-created_at"
                ),
                to_attr="prefetched_aftertaste_entries",
            ),
            Prefetch(
                "external_metadata",
                queryset=ExternalMetadata.objects.order_by("-last_refreshed_at"),
                to_attr="prefetched_external_metadata",
            ),
        )
        media_type = self.request.query_params.get("mediaType")
        status = self.request.query_params.get("status")
        search = self.request.query_params.get("search")
        creator = self.request.query_params.get("creator")

        if media_type:
            queryset = queryset.filter(media_type=media_type)
        if status:
            queryset = queryset.filter(status=status)
        if creator:
            queryset = queryset.filter(creator__icontains=creator.strip())
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(original_title__icontains=search)
                | Q(creator__icontains=search)
                | Q(notes__icontains=search)
            )

        queryset = _apply_decimal_range(
            queryset,
            field_name="personal_rating",
            min_value=self.request.query_params.get("ratingMin"),
            max_value=self.request.query_params.get("ratingMax"),
        )
        queryset = _apply_score_range(
            queryset,
            slug="genericness",
            min_value=self.request.query_params.get("genericnessMin"),
            max_value=self.request.query_params.get("genericnessMax"),
        )
        queryset = _apply_score_range(
            queryset,
            slug="regret_score",
            min_value=self.request.query_params.get("regretMin"),
            max_value=self.request.query_params.get("regretMax"),
        )
        completed_from = _parse_date_param(self.request.query_params.get("completedFrom"))
        completed_to = _parse_date_param(self.request.query_params.get("completedTo"))
        if completed_from:
            queryset = queryset.filter(completed_date__gte=completed_from)
        if completed_to:
            queryset = queryset.filter(completed_date__lte=completed_to)
        return queryset.distinct()

    def perform_create(self, serializer: MediaItemSerializer) -> None:
        serializer.save(owner=self.request.user)
        invalidate_user_data_cache(self.request.user)

    def perform_update(self, serializer: MediaItemSerializer) -> None:
        serializer.save()
        invalidate_user_data_cache(self.request.user)

    def perform_destroy(self, instance: MediaItem) -> None:
        instance.delete()
        invalidate_user_data_cache(self.request.user)


def _parse_decimal_param(value: str | None) -> Decimal | None:
    if value is None or value.strip() == "":
        return None
    try:
        return Decimal(value)
    except InvalidOperation:
        return None


def _parse_date_param(value: str | None) -> date | None:
    if value is None or value.strip() == "":
        return None
    return parse_date(value)


def _apply_decimal_range(
    queryset: QuerySet,
    *,
    field_name: str,
    min_value: str | None,
    max_value: str | None,
) -> QuerySet:
    minimum = _parse_decimal_param(min_value)
    maximum = _parse_decimal_param(max_value)
    if minimum is not None:
        queryset = queryset.filter(**{f"{field_name}__gte": minimum})
    if maximum is not None:
        queryset = queryset.filter(**{f"{field_name}__lte": maximum})
    return queryset


def _apply_score_range(
    queryset: QuerySet,
    *,
    slug: str,
    min_value: str | None,
    max_value: str | None,
) -> QuerySet:
    minimum = _parse_decimal_param(min_value)
    maximum = _parse_decimal_param(max_value)
    if minimum is not None:
        queryset = queryset.filter(scores__taste_dimension__slug=slug, scores__score__gte=minimum)
    if maximum is not None:
        queryset = queryset.filter(scores__taste_dimension__slug=slug, scores__score__lte=maximum)
    return queryset
