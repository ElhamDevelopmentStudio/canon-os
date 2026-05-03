from __future__ import annotations

from django.urls import path

from .views import (
    AnalyticsOverviewView,
    ConsumptionTimelineView,
    DimensionTrendsView,
    GenericnessSatisfactionView,
    MediaTypeDistributionView,
    RatingDistributionView,
    RegretTimeCostView,
    TopCreatorsView,
    TopThemesView,
)

urlpatterns = [
    path("analytics/", AnalyticsOverviewView.as_view(), name="analytics-overview"),
    path(
        "analytics/consumption-timeline/",
        ConsumptionTimelineView.as_view(),
        name="analytics-consumption-timeline",
    ),
    path(
        "analytics/rating-distribution/",
        RatingDistributionView.as_view(),
        name="analytics-rating-distribution",
    ),
    path(
        "analytics/media-type-distribution/",
        MediaTypeDistributionView.as_view(),
        name="analytics-media-type-distribution",
    ),
    path(
        "analytics/dimension-trends/",
        DimensionTrendsView.as_view(),
        name="analytics-dimension-trends",
    ),
    path(
        "analytics/genericness-satisfaction/",
        GenericnessSatisfactionView.as_view(),
        name="analytics-genericness-satisfaction",
    ),
    path(
        "analytics/regret-time-cost/",
        RegretTimeCostView.as_view(),
        name="analytics-regret-time-cost",
    ),
    path("analytics/top-creators/", TopCreatorsView.as_view(), name="analytics-top-creators"),
    path("analytics/top-themes/", TopThemesView.as_view(), name="analytics-top-themes"),
]
