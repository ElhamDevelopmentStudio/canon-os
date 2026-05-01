from __future__ import annotations

from rest_framework import serializers

from canonos.taste.defaults import SCORE_MAX, SCORE_MIN

from .models import MediaScore, TasteDimension


class TasteDimensionSerializer(serializers.ModelSerializer):
    isDefault = serializers.BooleanField(source="is_default", read_only=True)

    class Meta:
        model = TasteDimension
        fields = ["id", "name", "slug", "description", "direction", "isDefault"]
        read_only_fields = fields


class MediaScoreSerializer(serializers.ModelSerializer):
    mediaItemId = serializers.UUIDField(source="media_item_id", read_only=True)
    dimensionId = serializers.UUIDField(source="taste_dimension_id", read_only=True)
    dimensionSlug = serializers.CharField(source="taste_dimension.slug", read_only=True)
    dimensionName = serializers.CharField(source="taste_dimension.name", read_only=True)
    dimensionDirection = serializers.CharField(source="taste_dimension.direction", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = MediaScore
        fields = [
            "id",
            "mediaItemId",
            "dimensionId",
            "dimensionSlug",
            "dimensionName",
            "dimensionDirection",
            "score",
            "note",
            "updatedAt",
        ]
        read_only_fields = fields


class MediaScoreUpsertSerializer(serializers.Serializer):
    dimensionId = serializers.UUIDField()
    score = serializers.DecimalField(
        max_digits=3,
        decimal_places=1,
        min_value=SCORE_MIN,
        max_value=SCORE_MAX,
        allow_null=True,
    )
    note = serializers.CharField(required=False, allow_blank=True)


class MediaScoresBulkUpsertSerializer(serializers.Serializer):
    scores = MediaScoreUpsertSerializer(many=True)


class TasteSignalSerializer(serializers.Serializer):
    dimensionSlug = serializers.CharField()
    dimensionName = serializers.CharField()
    dimensionDirection = serializers.ChoiceField(choices=TasteDimension.Direction.choices)
    averageScore = serializers.FloatField()
    scoreCount = serializers.IntegerField()
    evidenceLabel = serializers.CharField()


class NegativeTasteSignalSerializer(serializers.Serializer):
    slug = serializers.ChoiceField(choices=["genericness", "regret_score"])
    label = serializers.CharField()
    warningCount = serializers.IntegerField()
    averageScore = serializers.FloatField(allow_null=True)
    evidenceLabel = serializers.CharField()


class MediumPreferenceSerializer(serializers.Serializer):
    mediaType = serializers.CharField()
    averageRating = serializers.FloatField(allow_null=True)
    mediaCount = serializers.IntegerField()
    completedCount = serializers.IntegerField()
    scoreCount = serializers.IntegerField()


class TasteProfileEvidenceCountsSerializer(serializers.Serializer):
    mediaCount = serializers.IntegerField()
    scoredMediaCount = serializers.IntegerField()
    scoreCount = serializers.IntegerField()
    aftertasteCount = serializers.IntegerField()


class TasteProfileInfluentialWorkSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    title = serializers.CharField()
    mediaType = serializers.CharField()
    personalRating = serializers.FloatField(allow_null=True)
    stayedWithMeScore = serializers.IntegerField(allow_null=True)
    worthTime = serializers.BooleanField(allow_null=True)
    feltGeneric = serializers.BooleanField(allow_null=True)
    appetiteEffect = serializers.CharField(allow_null=True)
    updatedAt = serializers.DateTimeField()


class TasteProfileSummarySerializer(serializers.Serializer):
    generatedSummary = serializers.CharField()
    isEmpty = serializers.BooleanField()
    confidence = serializers.ChoiceField(choices=["low", "medium", "high"])
    evidenceCounts = TasteProfileEvidenceCountsSerializer()
    strongestDimensions = TasteSignalSerializer(many=True)
    weakestDimensions = TasteSignalSerializer(many=True)
    negativeSignals = NegativeTasteSignalSerializer(many=True)
    mediumPreferences = MediumPreferenceSerializer(many=True)
    strongestMediumPreference = MediumPreferenceSerializer(allow_null=True)
    weakestMediumPreference = MediumPreferenceSerializer(allow_null=True)
    recentlyInfluentialWorks = TasteProfileInfluentialWorkSerializer(many=True)
    generatedAt = serializers.DateTimeField()
