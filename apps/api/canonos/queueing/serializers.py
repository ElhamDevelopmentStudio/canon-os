from __future__ import annotations

from rest_framework import serializers

from canonos.candidates.models import Candidate
from canonos.media.models import MediaItem

from .models import QueueItem, TonightModeSession
from .services import infer_queue_metric_defaults


class QueueItemSerializer(serializers.ModelSerializer):
    title = serializers.CharField(required=False)
    mediaItemId = serializers.UUIDField(
        source="media_item_id",
        required=False,
        allow_null=True,
    )
    candidateId = serializers.UUIDField(
        source="candidate_id",
        required=False,
        allow_null=True,
    )
    mediaType = serializers.ChoiceField(
        source="media_type",
        choices=MediaItem.MediaType.choices,
        required=False,
    )
    estimatedTimeMinutes = serializers.IntegerField(
        source="estimated_time_minutes",
        min_value=0,
        required=False,
        allow_null=True,
    )
    bestMood = serializers.CharField(source="best_mood", required=False, allow_blank=True)
    moodCompatibility = serializers.IntegerField(
        source="mood_compatibility",
        min_value=0,
        max_value=100,
        required=False,
    )
    intensityLevel = serializers.IntegerField(
        source="intensity_level",
        min_value=0,
        max_value=10,
        required=False,
    )
    complexityLevel = serializers.IntegerField(
        source="complexity_level",
        min_value=0,
        max_value=10,
        required=False,
    )
    commitmentLevel = serializers.IntegerField(
        source="commitment_level",
        min_value=0,
        max_value=10,
        required=False,
    )
    freshnessScore = serializers.FloatField(
        source="freshness_score",
        min_value=0,
        max_value=100,
        required=False,
    )
    lastRecommendedAt = serializers.DateTimeField(
        source="last_recommended_at",
        read_only=True,
    )
    timesRecommended = serializers.IntegerField(
        source="times_recommended",
        min_value=0,
        required=False,
    )
    isArchived = serializers.BooleanField(source="is_archived", required=False)
    queuePosition = serializers.IntegerField(
        source="queue_position",
        min_value=0,
        required=False,
    )
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = QueueItem
        fields = [
            "id",
            "mediaItemId",
            "candidateId",
            "title",
            "mediaType",
            "priority",
            "reason",
            "estimatedTimeMinutes",
            "bestMood",
            "moodCompatibility",
            "intensityLevel",
            "complexityLevel",
            "commitmentLevel",
            "freshnessScore",
            "lastRecommendedAt",
            "timesRecommended",
            "isArchived",
            "queuePosition",
            "createdAt",
            "updatedAt",
        ]
        read_only_fields = ["id", "lastRecommendedAt", "createdAt", "updatedAt"]

    def validate(self, attrs):  # noqa: ANN001, ANN201
        request = self.context["request"]
        media_item_id = attrs.get("media_item_id")
        candidate_id = attrs.get("candidate_id")
        media_item = None
        candidate = None

        if media_item_id:
            media_item = MediaItem.objects.filter(owner=request.user, id=media_item_id).first()
            if media_item is None:
                raise serializers.ValidationError({"mediaItemId": "Media item not found."})
        if candidate_id:
            candidate = Candidate.objects.filter(owner=request.user, id=candidate_id).first()
            if candidate is None:
                raise serializers.ValidationError({"candidateId": "Candidate not found."})

        title = attrs.get("title") or getattr(self.instance, "title", "")
        media_type = attrs.get("media_type") or getattr(self.instance, "media_type", "")
        if media_item:
            title = title or media_item.title
            media_type = media_type or media_item.media_type
        if candidate:
            title = title or candidate.title
            media_type = media_type or candidate.media_type

        if not title:
            raise serializers.ValidationError(
                {"title": "Provide a title or linked media/candidate."}
            )
        if not media_type:
            raise serializers.ValidationError(
                {"mediaType": "Provide a media type or linked media/candidate."}
            )

        attrs["title"] = title
        attrs["media_type"] = media_type
        should_infer_metrics = self.instance is None
        if should_infer_metrics:
            defaults = infer_queue_metric_defaults(
                title=title,
                media_type=media_type,
                priority=attrs.get("priority", QueueItem.Priority.START_SOON),
                estimated_time_minutes=attrs.get("estimated_time_minutes"),
                best_mood=attrs.get("best_mood", ""),
                reason=attrs.get("reason", ""),
            )
            attrs.setdefault("mood_compatibility", defaults.mood_compatibility)
            attrs.setdefault("intensity_level", defaults.intensity_level)
            attrs.setdefault("complexity_level", defaults.complexity_level)
            attrs.setdefault("commitment_level", defaults.commitment_level)
        return attrs


class QueueReorderSerializer(serializers.Serializer):
    itemIds = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False,
    )


class QueueReorderResponseSerializer(serializers.Serializer):
    results = QueueItemSerializer(many=True)


class QueueScoreSerializer(serializers.Serializer):
    itemId = serializers.UUIDField(source="item_id")
    score = serializers.FloatField()
    freshnessScore = serializers.FloatField(source="freshness_score")
    priority = serializers.ChoiceField(choices=QueueItem.Priority.choices)
    isArchived = serializers.BooleanField(source="is_archived")
    reason = serializers.CharField()


class QueueRecalculateSummarySerializer(serializers.Serializer):
    activeCount = serializers.IntegerField(source="active_count")
    archivedCount = serializers.IntegerField(source="archived_count")
    averageScore = serializers.FloatField(source="average_score")
    topInsight = serializers.CharField(source="top_insight")
    fatigueWarnings = serializers.ListField(
        source="fatigue_warnings",
        child=serializers.CharField(),
    )


class QueueRecalculateResponseSerializer(serializers.Serializer):
    results = QueueItemSerializer(many=True)
    scores = QueueScoreSerializer(many=True)
    summary = QueueRecalculateSummarySerializer()


class TonightModeRequestSerializer(serializers.Serializer):
    availableMinutes = serializers.IntegerField(
        source="available_minutes", min_value=1, max_value=1440, required=False
    )
    energyLevel = serializers.ChoiceField(
        source="energy_level",
        choices=TonightModeSession.EnergyLevel.choices,
        required=False,
    )
    focusLevel = serializers.ChoiceField(
        source="focus_level",
        choices=TonightModeSession.FocusLevel.choices,
        required=False,
    )
    desiredEffect = serializers.ChoiceField(
        source="desired_effect",
        choices=TonightModeSession.DesiredEffect.choices,
        required=False,
    )
    preferredMediaTypes = serializers.ListField(
        source="preferred_media_types",
        child=serializers.ChoiceField(choices=MediaItem.MediaType.choices),
        required=False,
        allow_empty=True,
    )
    riskTolerance = serializers.ChoiceField(
        source="risk_tolerance",
        choices=TonightModeSession.RiskTolerance.choices,
        required=False,
    )


class TonightModeRecommendationSerializer(serializers.Serializer):
    slot = serializers.ChoiceField(choices=["safe", "challenging", "wildcard"])
    source = serializers.ChoiceField(choices=["queue", "planned_media"])
    title = serializers.CharField()
    mediaType = serializers.ChoiceField(choices=MediaItem.MediaType.choices)
    reason = serializers.CharField()
    score = serializers.FloatField()
    estimatedTimeMinutes = serializers.IntegerField(allow_null=True)
    queueItemId = serializers.UUIDField(allow_null=True)
    mediaItemId = serializers.UUIDField(allow_null=True)
    candidateId = serializers.UUIDField(allow_null=True)
    priority = serializers.ChoiceField(choices=QueueItem.Priority.choices, allow_null=True)
    moodCompatibility = serializers.IntegerField(min_value=0, max_value=100)
    intensityLevel = serializers.IntegerField(min_value=0, max_value=10)
    complexityLevel = serializers.IntegerField(min_value=0, max_value=10)
    commitmentLevel = serializers.IntegerField(min_value=0, max_value=10)
    freshnessScore = serializers.FloatField(min_value=0, max_value=100)


class TonightModeSessionSerializer(serializers.ModelSerializer):
    availableMinutes = serializers.IntegerField(source="available_minutes")
    energyLevel = serializers.CharField(source="energy_level")
    focusLevel = serializers.CharField(source="focus_level")
    desiredEffect = serializers.CharField(source="desired_effect")
    preferredMediaTypes = serializers.ListField(
        source="preferred_media_types", child=serializers.CharField()
    )
    riskTolerance = serializers.CharField(source="risk_tolerance")
    recommendations = serializers.JSONField(source="generated_recommendations")
    createdAt = serializers.DateTimeField(source="created_at")

    class Meta:
        model = TonightModeSession
        fields = [
            "id",
            "availableMinutes",
            "energyLevel",
            "focusLevel",
            "desiredEffect",
            "preferredMediaTypes",
            "riskTolerance",
            "recommendations",
            "createdAt",
        ]


class TonightModeResponseSerializer(serializers.Serializer):
    session = TonightModeSessionSerializer()
    recommendations = TonightModeRecommendationSerializer(many=True)
    safeChoice = TonightModeRecommendationSerializer(allow_null=True)
    challengingChoice = TonightModeRecommendationSerializer(allow_null=True)
    wildcardChoice = TonightModeRecommendationSerializer(allow_null=True)
