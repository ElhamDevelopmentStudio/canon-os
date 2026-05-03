from __future__ import annotations

from rest_framework import serializers

from canonos.media.serializers import MediaItemSerializer

from .models import AntiGenericEvaluation, AntiGenericRule


class AntiGenericSignalSerializer(serializers.Serializer):
    ruleId = serializers.UUIDField()
    ruleKey = serializers.CharField()
    name = serializers.CharField()
    description = serializers.CharField()
    weight = serializers.IntegerField()
    score = serializers.IntegerField()
    evidence = serializers.CharField()


class AntiGenericEvaluationSerializer(serializers.ModelSerializer):
    candidateId = serializers.UUIDField(source="candidate_id", read_only=True)
    mediaItemId = serializers.UUIDField(source="media_item_id", read_only=True, allow_null=True)
    genericnessRiskScore = serializers.IntegerField(source="genericness_risk_score", read_only=True)
    timeWasteRiskScore = serializers.IntegerField(source="time_waste_risk_score", read_only=True)
    positiveExceptionScore = serializers.IntegerField(
        source="positive_exception_score", read_only=True
    )
    detectedSignals = AntiGenericSignalSerializer(
        source="detected_signals", many=True, read_only=True
    )
    positiveExceptions = AntiGenericSignalSerializer(
        source="positive_exceptions", many=True, read_only=True
    )
    finalVerdict = serializers.CharField(source="final_verdict", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = AntiGenericEvaluation
        fields = [
            "id",
            "candidateId",
            "mediaItemId",
            "genericnessRiskScore",
            "timeWasteRiskScore",
            "positiveExceptionScore",
            "detectedSignals",
            "positiveExceptions",
            "finalVerdict",
            "createdAt",
        ]
        read_only_fields = fields


class AntiGenericRuleSerializer(serializers.ModelSerializer):
    isPositiveException = serializers.BooleanField(source="is_positive_exception", read_only=True)
    isEnabled = serializers.BooleanField(source="is_enabled", required=False)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = AntiGenericRule
        fields = [
            "id",
            "key",
            "name",
            "description",
            "weight",
            "isPositiveException",
            "isEnabled",
            "createdAt",
            "updatedAt",
        ]
        read_only_fields = [
            "id",
            "key",
            "name",
            "description",
            "isPositiveException",
            "createdAt",
            "updatedAt",
        ]


class AntiGenericEvaluateRequestSerializer(serializers.Serializer):
    candidateId = serializers.UUIDField()
    mediaItemId = serializers.UUIDField(required=False, allow_null=True)


class AntiGenericEvaluateResponseSerializer(serializers.Serializer):
    evaluation = AntiGenericEvaluationSerializer()
    mediaItem = MediaItemSerializer(required=False, allow_null=True)
