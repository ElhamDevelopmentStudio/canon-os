from __future__ import annotations

from rest_framework import serializers

from canonos.media.serializers import MediaItemSerializer

from .models import DetoxDecision, DetoxRule


class DetoxRuleSerializer(serializers.ModelSerializer):
    mediaType = serializers.CharField(source="media_type", allow_null=True, read_only=True)
    sampleLimit = serializers.IntegerField(source="sample_limit", min_value=0, required=False)
    isEnabled = serializers.BooleanField(source="is_enabled", required=False)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = DetoxRule
        fields = [
            "id",
            "key",
            "name",
            "description",
            "mediaType",
            "sampleLimit",
            "condition",
            "isEnabled",
            "createdAt",
            "updatedAt",
        ]
        read_only_fields = [
            "id",
            "key",
            "name",
            "description",
            "mediaType",
            "createdAt",
            "updatedAt",
        ]


class DetoxDecisionSerializer(serializers.ModelSerializer):
    mediaItemId = serializers.UUIDField(source="media_item_id", read_only=True)
    mediaItemTitle = serializers.CharField(source="media_item.title", read_only=True)
    mediaType = serializers.CharField(source="media_item.media_type", read_only=True)
    ruleId = serializers.UUIDField(source="rule_id", read_only=True, allow_null=True)
    ruleName = serializers.CharField(source="rule.name", read_only=True, allow_null=True)
    estimatedTimeSavedMinutes = serializers.IntegerField(
        source="estimated_time_saved_minutes",
        read_only=True,
    )
    progressValue = serializers.IntegerField(source="progress_value", read_only=True)
    motivationScore = serializers.IntegerField(source="motivation_score", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = DetoxDecision
        fields = [
            "id",
            "mediaItemId",
            "mediaItemTitle",
            "mediaType",
            "ruleId",
            "ruleName",
            "decision",
            "reason",
            "estimatedTimeSavedMinutes",
            "progressValue",
            "motivationScore",
            "createdAt",
        ]
        read_only_fields = fields


class DetoxEvaluateRequestSerializer(serializers.Serializer):
    mediaItemId = serializers.UUIDField()
    progressValue = serializers.IntegerField(min_value=0)
    motivationScore = serializers.IntegerField(min_value=1, max_value=10)


class TimeSavedEntrySerializer(serializers.Serializer):
    decisionId = serializers.UUIDField()
    mediaItemId = serializers.UUIDField()
    mediaItemTitle = serializers.CharField()
    decision = serializers.ChoiceField(
        choices=[
            DetoxDecision.Decision.DROP,
            DetoxDecision.Decision.PAUSE,
            DetoxDecision.Decision.DELAY,
            DetoxDecision.Decision.ARCHIVE,
        ],
    )
    estimatedTimeSavedMinutes = serializers.IntegerField()
    createdAt = serializers.DateTimeField()


class DetoxTimeSavedSummarySerializer(serializers.Serializer):
    totalMinutes = serializers.IntegerField()
    currentMonthMinutes = serializers.IntegerField()
    decisionCount = serializers.IntegerField()
    entries = TimeSavedEntrySerializer(many=True)


class DetoxEvaluateResponseSerializer(serializers.Serializer):
    decision = DetoxDecisionSerializer()
    matchedRule = DetoxRuleSerializer(allow_null=True)
    mediaItem = MediaItemSerializer()
    timeSavedSummary = DetoxTimeSavedSummarySerializer()


class DetoxRuleListSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    next = serializers.CharField(allow_null=True)
    previous = serializers.CharField(allow_null=True)
    results = DetoxRuleSerializer(many=True)


class DetoxDecisionListSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    next = serializers.CharField(allow_null=True)
    previous = serializers.CharField(allow_null=True)
    results = DetoxDecisionSerializer(many=True)
