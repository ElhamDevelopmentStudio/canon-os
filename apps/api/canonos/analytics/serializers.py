from __future__ import annotations

from rest_framework import serializers

from canonos.media.models import MediaItem
from canonos.taste.models import TasteDimension


class AnalyticsBaseSerializer(serializers.Serializer):
    isEmpty = serializers.BooleanField()
    generatedAt = serializers.DateTimeField()


class ConsumptionTimelinePointSerializer(serializers.Serializer):
    period = serializers.CharField()
    label = serializers.CharField()
    completedCount = serializers.IntegerField()
    droppedCount = serializers.IntegerField()
    totalCount = serializers.IntegerField()
    averageRating = serializers.FloatField(allow_null=True)


class ConsumptionTimelineSerializer(AnalyticsBaseSerializer):
    points = ConsumptionTimelinePointSerializer(many=True)


class RatingDistributionBucketSerializer(serializers.Serializer):
    bucket = serializers.CharField()
    label = serializers.CharField()
    minRating = serializers.FloatField()
    maxRating = serializers.FloatField()
    count = serializers.IntegerField()


class RatingDistributionSerializer(AnalyticsBaseSerializer):
    ratedCount = serializers.IntegerField()
    averageRating = serializers.FloatField(allow_null=True)
    buckets = RatingDistributionBucketSerializer(many=True)


class MediaTypeDistributionRowSerializer(serializers.Serializer):
    mediaType = serializers.ChoiceField(choices=MediaItem.MediaType.choices)
    count = serializers.IntegerField()
    completedCount = serializers.IntegerField()
    averageRating = serializers.FloatField(allow_null=True)
    sharePercent = serializers.FloatField()


class MediaTypeDistributionSerializer(AnalyticsBaseSerializer):
    totalCount = serializers.IntegerField()
    results = MediaTypeDistributionRowSerializer(many=True)


class DimensionTrendPointSerializer(serializers.Serializer):
    period = serializers.CharField()
    label = serializers.CharField()
    averageScore = serializers.FloatField(allow_null=True)
    scoreCount = serializers.IntegerField()


class DimensionTrendSerializer(serializers.Serializer):
    dimensionId = serializers.UUIDField()
    dimensionSlug = serializers.CharField()
    dimensionName = serializers.CharField()
    dimensionDirection = serializers.ChoiceField(choices=TasteDimension.Direction.choices)
    averageScore = serializers.FloatField(allow_null=True)
    scoreCount = serializers.IntegerField()
    points = DimensionTrendPointSerializer(many=True)


class DimensionTrendsSerializer(AnalyticsBaseSerializer):
    dimensions = DimensionTrendSerializer(many=True)


class GenericnessSatisfactionPointSerializer(serializers.Serializer):
    mediaItemId = serializers.UUIDField()
    title = serializers.CharField()
    mediaType = serializers.ChoiceField(choices=MediaItem.MediaType.choices)
    genericnessScore = serializers.FloatField(allow_null=True)
    satisfactionScore = serializers.FloatField(allow_null=True)


class GenericnessSatisfactionSerializer(AnalyticsBaseSerializer):
    points = GenericnessSatisfactionPointSerializer(many=True)
    averageGenericness = serializers.FloatField(allow_null=True)
    averageSatisfaction = serializers.FloatField(allow_null=True)
    insight = serializers.CharField()


class RegretTimeCostPointSerializer(serializers.Serializer):
    mediaItemId = serializers.UUIDField()
    title = serializers.CharField()
    mediaType = serializers.ChoiceField(choices=MediaItem.MediaType.choices)
    regretScore = serializers.FloatField(allow_null=True)
    timeCostMinutes = serializers.IntegerField(allow_null=True)


class RegretTimeCostSerializer(AnalyticsBaseSerializer):
    points = RegretTimeCostPointSerializer(many=True)
    averageRegret = serializers.FloatField(allow_null=True)
    totalHighRegretMinutes = serializers.IntegerField()
    insight = serializers.CharField()


class TopCreatorSerializer(serializers.Serializer):
    creator = serializers.CharField()
    count = serializers.IntegerField()
    completedCount = serializers.IntegerField()
    averageRating = serializers.FloatField(allow_null=True)
    bestTitle = serializers.CharField(allow_null=True)
    negativeSignalCount = serializers.IntegerField()


class TopCreatorsSerializer(AnalyticsBaseSerializer):
    results = TopCreatorSerializer(many=True)


class TopThemeSerializer(serializers.Serializer):
    key = serializers.CharField()
    label = serializers.CharField()
    count = serializers.IntegerField()
    averageScore = serializers.FloatField(allow_null=True)
    exampleTitle = serializers.CharField(allow_null=True)


class TopThemesSerializer(AnalyticsBaseSerializer):
    results = TopThemeSerializer(many=True)


class AnalyticsOverviewSerializer(serializers.Serializer):
    consumptionTimeline = ConsumptionTimelineSerializer()
    ratingDistribution = RatingDistributionSerializer()
    mediaTypeDistribution = MediaTypeDistributionSerializer()
    dimensionTrends = DimensionTrendsSerializer()
    genericnessSatisfaction = GenericnessSatisfactionSerializer()
    regretTimeCost = RegretTimeCostSerializer()
    topCreators = TopCreatorsSerializer()
    topThemes = TopThemesSerializer()
