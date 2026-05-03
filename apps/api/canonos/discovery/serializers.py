from __future__ import annotations

from rest_framework import serializers

from canonos.media.models import MediaItem

from .models import DiscoveryTrail

DISCOVERY_MODES = [
    ("deep_cut", "Deep cut"),
    ("cross_medium", "Cross-medium"),
    ("creator_adjacent", "Creator adjacent"),
    ("theme_map", "Theme map"),
    ("modern_exception", "Modern exception"),
]

DISCOVERY_ERAS = [
    ("", "Any"),
    ("pre_1970", "Pre-1970"),
    ("1970s_1990s", "1970s-1990s"),
    ("2000s", "2000s-mid 2010s"),
    ("modern_exception", "Modern exceptions"),
]

DISCOVERY_REASON_KINDS = [
    ("taste_expansion", "Taste expansion"),
    ("underexplored_medium", "Underexplored medium"),
    ("underexplored_era", "Underexplored era"),
    ("underexplored_region", "Underexplored region"),
    ("creator_adjacent", "Creator adjacent"),
    ("theme_adjacent", "Theme adjacent"),
    ("deep_cut_score", "Deep-cut score"),
    ("risk", "Risk"),
    ("action", "Action"),
]


class DiscoverySearchRequestSerializer(serializers.Serializer):
    mode = serializers.ChoiceField(choices=DISCOVERY_MODES, default="deep_cut")
    theme = serializers.CharField(required=False, allow_blank=True, max_length=255)
    mood = serializers.CharField(required=False, allow_blank=True, max_length=255)
    era = serializers.ChoiceField(choices=DISCOVERY_ERAS, required=False, allow_blank=True)
    countryLanguage = serializers.CharField(
        source="country_language",
        required=False,
        allow_blank=True,
        max_length=120,
    )
    mediaType = serializers.ChoiceField(
        source="media_type",
        choices=MediaItem.MediaType.choices,
        required=False,
        allow_blank=True,
    )
    creator = serializers.CharField(required=False, allow_blank=True, max_length=255)
    narrativePattern = serializers.CharField(
        source="narrative_pattern",
        required=False,
        allow_blank=True,
        max_length=255,
    )
    favoriteWork = serializers.CharField(
        source="favorite_work",
        required=False,
        allow_blank=True,
        max_length=255,
    )
    sourceMediaItemId = serializers.UUIDField(
        source="source_media_item_id",
        required=False,
        allow_null=True,
    )


class DiscoveryReasonSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=DISCOVERY_REASON_KINDS)
    label = serializers.CharField()
    detail = serializers.CharField()
    weight = serializers.IntegerField(min_value=0, max_value=100)


class DiscoveryResultSerializer(serializers.Serializer):
    id = serializers.CharField()
    title = serializers.CharField()
    mediaType = serializers.ChoiceField(choices=MediaItem.MediaType.choices)
    releaseYear = serializers.IntegerField(allow_null=True)
    countryLanguage = serializers.CharField(allow_blank=True)
    creator = serializers.CharField(allow_blank=True)
    premise = serializers.CharField(allow_blank=True)
    discoveryScore = serializers.IntegerField(min_value=0, max_value=100)
    obscurityScore = serializers.IntegerField(min_value=0, max_value=100)
    confidenceScore = serializers.IntegerField(min_value=0, max_value=100)
    estimatedTimeMinutes = serializers.IntegerField(allow_null=True, min_value=0)
    reasons = DiscoveryReasonSerializer(many=True)
    expansionRationale = serializers.CharField()
    riskRationale = serializers.CharField()
    suggestedAction = serializers.CharField()


class DiscoveryAnalysisSerializer(serializers.Serializer):
    underexploredMediaTypes = serializers.ListField(child=serializers.CharField())
    underexploredEras = serializers.ListField(child=serializers.CharField())
    underexploredCountryLanguages = serializers.ListField(child=serializers.CharField())
    strongestMediaTypes = serializers.ListField(child=serializers.CharField())
    sourceTitle = serializers.CharField(allow_null=True)


class DiscoveryTrailDraftSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    theme = serializers.CharField(required=False, allow_blank=True, max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    sourceMediaItemId = serializers.UUIDField(required=False, allow_null=True)
    sourceMediaItemTitle = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    resultItems = DiscoveryResultSerializer(many=True)
    createdAt = serializers.DateTimeField(allow_null=True)


class DiscoveryGenerateResponseSerializer(serializers.Serializer):
    search = DiscoverySearchRequestSerializer()
    analysis = DiscoveryAnalysisSerializer()
    draft = DiscoveryTrailDraftSerializer()
    results = DiscoveryResultSerializer(many=True)
    generatedAt = serializers.DateTimeField()


class DiscoveryTrailSerializer(serializers.ModelSerializer):
    sourceMediaItemId = serializers.UUIDField(
        source="source_media_item_id",
        required=False,
        allow_null=True,
    )
    sourceMediaItemTitle = serializers.SerializerMethodField()
    resultItems = DiscoveryResultSerializer(source="result_items", many=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = DiscoveryTrail
        fields = [
            "id",
            "name",
            "theme",
            "description",
            "sourceMediaItemId",
            "sourceMediaItemTitle",
            "resultItems",
            "createdAt",
        ]
        read_only_fields = ["id", "createdAt", "sourceMediaItemTitle"]

    def get_sourceMediaItemTitle(self, obj: DiscoveryTrail) -> str | None:  # noqa: N802
        return obj.source_media_item.title if obj.source_media_item else None

    def validate_source_media_item_id(self, value):  # noqa: ANN001, ANN201
        if value is None:
            return value
        request = self.context["request"]
        if not MediaItem.objects.filter(owner=request.user, id=value).exists():
            raise serializers.ValidationError("Source media item not found.")
        return value
