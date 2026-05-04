from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from canonos.common.cache import cache_user_payload

from .serializers import (
    AnalyticsOverviewSerializer,
    ConsumptionTimelineSerializer,
    DimensionTrendsSerializer,
    GenericnessSatisfactionSerializer,
    MediaTypeDistributionSerializer,
    RatingDistributionSerializer,
    RegretTimeCostSerializer,
    TopCreatorsSerializer,
    TopThemesSerializer,
)
from .services import (
    build_analytics_overview,
    build_consumption_timeline,
    build_dimension_trends,
    build_genericness_satisfaction,
    build_media_type_distribution,
    build_rating_distribution,
    build_regret_time_cost,
    build_top_creators,
    build_top_themes,
)


class AnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def respond(self, serializer_class, payload):  # noqa: ANN001, ANN201
        serializer = serializer_class(payload)
        return Response(serializer.data)

    def cached_respond(self, request, namespace: str, serializer_class, builder):  # noqa: ANN001, ANN201
        return self.respond(
            serializer_class,
            cache_user_payload(request.user, namespace, lambda: builder(request.user)),
        )


class AnalyticsOverviewView(AnalyticsView):
    @extend_schema(
        responses=AnalyticsOverviewSerializer,
        summary="Get analytics overview",
        description="Return all private insight analytics needed by the Insights page.",
    )
    def get(self, request):  # noqa: ANN001, ANN201
        return self.cached_respond(
            request, "analytics-overview", AnalyticsOverviewSerializer, build_analytics_overview
        )


class ConsumptionTimelineView(AnalyticsView):
    @extend_schema(
        responses=ConsumptionTimelineSerializer,
        summary="Get media consumption timeline",
        description="Group completed and dropped media by month for the current user.",
    )
    def get(self, request):  # noqa: ANN001, ANN201
        return self.cached_respond(
            request,
            "analytics-consumption-timeline",
            ConsumptionTimelineSerializer,
            build_consumption_timeline,
        )


class RatingDistributionView(AnalyticsView):
    @extend_schema(
        responses=RatingDistributionSerializer,
        summary="Get rating distribution",
        description="Count current user's rated media in simple 0-10 buckets.",
    )
    def get(self, request):  # noqa: ANN001, ANN201
        return self.cached_respond(
            request,
            "analytics-rating-distribution",
            RatingDistributionSerializer,
            build_rating_distribution,
        )


class MediaTypeDistributionView(AnalyticsView):
    @extend_schema(
        responses=MediaTypeDistributionSerializer,
        summary="Get media type distribution",
        description="Summarize current user's library by medium.",
    )
    def get(self, request):  # noqa: ANN001, ANN201
        return self.cached_respond(
            request,
            "analytics-media-type-distribution",
            MediaTypeDistributionSerializer,
            build_media_type_distribution,
        )


class DimensionTrendsView(AnalyticsView):
    @extend_schema(
        responses=DimensionTrendsSerializer,
        summary="Get taste dimension trends",
        description="Group taste scores by dimension and month for the current user.",
    )
    def get(self, request):  # noqa: ANN001, ANN201
        return self.cached_respond(
            request, "analytics-dimension-trends", DimensionTrendsSerializer, build_dimension_trends
        )


class GenericnessSatisfactionView(AnalyticsView):
    @extend_schema(
        responses=GenericnessSatisfactionSerializer,
        summary="Get genericness versus satisfaction",
        description="Compare genericness scores against personal ratings for the current user.",
    )
    def get(self, request):  # noqa: ANN001, ANN201
        return self.cached_respond(
            request,
            "analytics-genericness-satisfaction",
            GenericnessSatisfactionSerializer,
            build_genericness_satisfaction,
        )


class RegretTimeCostView(AnalyticsView):
    @extend_schema(
        responses=RegretTimeCostSerializer,
        summary="Get regret versus time cost",
        description="Compare regret scores against estimated time cost for the current user.",
    )
    def get(self, request):  # noqa: ANN001, ANN201
        return self.cached_respond(
            request, "analytics-regret-time-cost", RegretTimeCostSerializer, build_regret_time_cost
        )


class TopCreatorsView(AnalyticsView):
    @extend_schema(
        responses=TopCreatorsSerializer,
        summary="Get top creators",
        description="Rank creators by current user's library evidence.",
    )
    def get(self, request):  # noqa: ANN001, ANN201
        return self.cached_respond(
            request, "analytics-top-creators", TopCreatorsSerializer, build_top_creators
        )


class TopThemesView(AnalyticsView):
    @extend_schema(
        responses=TopThemesSerializer,
        summary="Get top themes",
        description=(
            "Rank narrative traits from completed Narrative DNA analyses for the current user."
        ),
    )
    def get(self, request):  # noqa: ANN001, ANN201
        return self.cached_respond(
            request, "analytics-top-themes", TopThemesSerializer, build_top_themes
        )
