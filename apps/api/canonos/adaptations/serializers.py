from __future__ import annotations

from typing import Any

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from canonos.media.models import MediaItem

from .models import AdaptationRelation


class AdaptationRelationSerializer(serializers.ModelSerializer):
    sourceMediaItemId = serializers.UUIDField(source="source_media_item_id")
    adaptationMediaItemId = serializers.UUIDField(source="adaptation_media_item_id")
    sourceTitle = serializers.CharField(source="source_media_item.title", read_only=True)
    adaptationTitle = serializers.CharField(source="adaptation_media_item.title", read_only=True)
    sourceMediaType = serializers.CharField(source="source_media_item.media_type", read_only=True)
    adaptationMediaType = serializers.CharField(
        source="adaptation_media_item.media_type",
        read_only=True,
    )
    relationType = serializers.ChoiceField(
        source="relation_type",
        choices=AdaptationRelation.RelationType.choices,
    )
    faithfulnessScore = serializers.IntegerField(
        source="faithfulness_score",
        required=False,
        allow_null=True,
        min_value=0,
        max_value=100,
    )
    pacingPreservationScore = serializers.IntegerField(
        source="pacing_preservation_score",
        required=False,
        allow_null=True,
        min_value=0,
        max_value=100,
    )
    soulPreservationScore = serializers.IntegerField(
        source="soul_preservation_score",
        required=False,
        allow_null=True,
        min_value=0,
        max_value=100,
    )
    recommendedExperienceOrder = serializers.ChoiceField(
        source="recommended_experience_order",
        choices=AdaptationRelation.ExperienceOrder.choices,
    )
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = AdaptationRelation
        fields = [
            "id",
            "sourceMediaItemId",
            "adaptationMediaItemId",
            "sourceTitle",
            "adaptationTitle",
            "sourceMediaType",
            "adaptationMediaType",
            "relationType",
            "completeness",
            "faithfulnessScore",
            "pacingPreservationScore",
            "soulPreservationScore",
            "recommendedExperienceOrder",
            "notes",
            "createdAt",
            "updatedAt",
        ]
        read_only_fields = ["id", "sourceTitle", "adaptationTitle", "createdAt", "updatedAt"]

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        request = self.context.get("request")
        if request is None:
            raise serializers.ValidationError("Request context is required.")
        user = request.user
        source_id = attrs.get("source_media_item_id") or getattr(
            self.instance,
            "source_media_item_id",
            None,
        )
        adaptation_id = attrs.get("adaptation_media_item_id") or getattr(
            self.instance,
            "adaptation_media_item_id",
            None,
        )
        if source_id is None:
            raise serializers.ValidationError({"sourceMediaItemId": "Select a source media item."})
        if adaptation_id is None:
            raise serializers.ValidationError(
                {"adaptationMediaItemId": "Select an adaptation media item."}
            )
        if source_id == adaptation_id:
            raise serializers.ValidationError(
                {"adaptationMediaItemId": "Source and adaptation must be different items."}
            )
        if not MediaItem.objects.filter(owner=user, id=source_id).exists():
            raise serializers.ValidationError({"sourceMediaItemId": "Source media item not found."})
        if not MediaItem.objects.filter(owner=user, id=adaptation_id).exists():
            raise serializers.ValidationError(
                {"adaptationMediaItemId": "Adaptation media item not found."}
            )
        relation_type = attrs.get("relation_type") or getattr(self.instance, "relation_type", None)
        duplicate_queryset = AdaptationRelation.objects.filter(
            owner=user,
            source_media_item_id=source_id,
            adaptation_media_item_id=adaptation_id,
            relation_type=relation_type,
        )
        if self.instance is not None:
            duplicate_queryset = duplicate_queryset.exclude(id=self.instance.id)
        if duplicate_queryset.exists():
            raise serializers.ValidationError(
                {"relationType": "This source/adaptation relation already exists."}
            )
        return attrs


class AdaptationRelationListSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    next = serializers.CharField(allow_null=True)
    previous = serializers.CharField(allow_null=True)
    results = AdaptationRelationSerializer(many=True)


class AdaptationRiskSerializer(serializers.Serializer):
    kind = serializers.CharField()
    label = serializers.CharField()
    severity = serializers.CharField()
    reason = serializers.CharField()


class ExperienceOrderRecommendationSerializer(serializers.Serializer):
    recommendation = serializers.ChoiceField(choices=AdaptationRelation.ExperienceOrder.choices)
    label = serializers.CharField()
    rationale = serializers.CharField()
    confidenceScore = serializers.IntegerField(min_value=0, max_value=100)
    risks = AdaptationRiskSerializer(many=True)


class AdaptationPathSerializer(serializers.Serializer):
    mediaItemId = serializers.UUIDField()
    mediaTitle = serializers.CharField()
    relations = serializers.SerializerMethodField()
    recommendation = ExperienceOrderRecommendationSerializer()
    createdAt = serializers.DateTimeField()

    @extend_schema_field(AdaptationRelationSerializer(many=True))
    def get_relations(self, obj: dict[str, Any]) -> list[dict[str, Any]]:
        relations = obj.get("relations", [])
        return AdaptationRelationSerializer(relations, many=True, context=self.context).data
