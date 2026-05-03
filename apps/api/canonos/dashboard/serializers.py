from __future__ import annotations

from rest_framework import serializers

from canonos.media.models import MediaItem
from canonos.taste.models import TasteDimension


class DashboardCountsSerializer(serializers.Serializer):
    totalMedia = serializers.IntegerField()
    completedMedia = serializers.IntegerField()
    plannedMedia = serializers.IntegerField()
    droppedMedia = serializers.IntegerField()


class DashboardMediaTypeBreakdownSerializer(serializers.Serializer):
    mediaType = serializers.ChoiceField(choices=MediaItem.MediaType.choices)
    count = serializers.IntegerField()


class DashboardMediaItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    title = serializers.CharField()
    mediaType = serializers.ChoiceField(choices=MediaItem.MediaType.choices)
    status = serializers.ChoiceField(choices=MediaItem.ConsumptionStatus.choices)
    personalRating = serializers.FloatField(allow_null=True)
    updatedAt = serializers.DateTimeField()


class DashboardTopTasteSignalSerializer(serializers.Serializer):
    dimensionId = serializers.UUIDField()
    dimensionSlug = serializers.CharField()
    dimensionName = serializers.CharField()
    dimensionDirection = serializers.ChoiceField(choices=TasteDimension.Direction.choices)
    averageScore = serializers.FloatField()
    scoreCount = serializers.IntegerField()


class DashboardSummarySerializer(serializers.Serializer):
    counts = DashboardCountsSerializer()
    mediaTypeBreakdown = DashboardMediaTypeBreakdownSerializer(many=True)
    recentActivity = DashboardMediaItemSerializer(many=True)
    highestRated = DashboardMediaItemSerializer(many=True)
    topTasteSignals = DashboardTopTasteSignalSerializer(many=True)
    latestTasteEvolutionInsight = serializers.JSONField(allow_null=True)
    generatedAt = serializers.DateTimeField()
