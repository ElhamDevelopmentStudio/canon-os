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
