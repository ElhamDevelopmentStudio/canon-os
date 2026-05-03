from __future__ import annotations

from rest_framework import serializers

from canonos.media.models import MediaItem

from .models import NarrativeAnalysis


class NarrativeTraitSerializer(serializers.Serializer):
    key = serializers.CharField()
    label = serializers.CharField()
    description = serializers.CharField()
    score = serializers.IntegerField(min_value=0, max_value=100)
    confidenceScore = serializers.IntegerField(min_value=0, max_value=100)
    evidence = serializers.CharField()
    source = serializers.CharField()


class NarrativeAnalysisSerializer(serializers.ModelSerializer):
    mediaItemId = serializers.UUIDField(source="media_item_id", read_only=True)
    mediaTitle = serializers.CharField(source="media_item.title", read_only=True)
    characterComplexityScore = serializers.IntegerField(
        source="character_complexity_score",
        min_value=0,
        max_value=100,
        required=False,
    )
    plotComplexityScore = serializers.IntegerField(
        source="plot_complexity_score",
        min_value=0,
        max_value=100,
        required=False,
    )
    pacingDensityScore = serializers.IntegerField(
        source="pacing_density_score",
        min_value=0,
        max_value=100,
        required=False,
    )
    thematicWeightScore = serializers.IntegerField(
        source="thematic_weight_score",
        min_value=0,
        max_value=100,
        required=False,
    )
    moralAmbiguityScore = serializers.IntegerField(
        source="moral_ambiguity_score",
        min_value=0,
        max_value=100,
        required=False,
    )
    atmosphereScore = serializers.IntegerField(
        source="atmosphere_score",
        min_value=0,
        max_value=100,
        required=False,
    )
    endingDependencyScore = serializers.IntegerField(
        source="ending_dependency_score",
        min_value=0,
        max_value=100,
        required=False,
    )
    tropeFreshnessScore = serializers.IntegerField(
        source="trope_freshness_score",
        min_value=0,
        max_value=100,
        required=False,
    )
    confidenceScore = serializers.IntegerField(source="confidence_score", read_only=True)
    analysisSummary = serializers.CharField(
        source="analysis_summary",
        required=False,
        allow_blank=True,
    )
    extractedTraits = NarrativeTraitSerializer(source="extracted_traits", many=True, read_only=True)
    evidenceNotes = serializers.CharField(source="evidence_notes", required=False, allow_blank=True)
    sourceBasis = serializers.CharField(source="source_basis", read_only=True)
    algorithmVersion = serializers.CharField(source="algorithm_version", read_only=True)
    statusEvents = serializers.ListField(source="status_events", read_only=True)
    errorMessage = serializers.CharField(source="error_message", read_only=True)
    completedAt = serializers.DateTimeField(source="completed_at", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = NarrativeAnalysis
        fields = [
            "id",
            "mediaItemId",
            "mediaTitle",
            "status",
            "characterComplexityScore",
            "plotComplexityScore",
            "pacingDensityScore",
            "thematicWeightScore",
            "moralAmbiguityScore",
            "atmosphereScore",
            "endingDependencyScore",
            "tropeFreshnessScore",
            "confidenceScore",
            "analysisSummary",
            "extractedTraits",
            "evidenceNotes",
            "sourceBasis",
            "provider",
            "algorithmVersion",
            "statusEvents",
            "errorMessage",
            "completedAt",
            "createdAt",
            "updatedAt",
        ]
        read_only_fields = [
            "id",
            "mediaItemId",
            "mediaTitle",
            "status",
            "confidenceScore",
            "extractedTraits",
            "sourceBasis",
            "provider",
            "algorithmVersion",
            "statusEvents",
            "errorMessage",
            "completedAt",
            "createdAt",
            "updatedAt",
        ]

    def update(self, instance: NarrativeAnalysis, validated_data):  # noqa: ANN001, ANN201
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.source_basis = NarrativeAnalysis.SourceBasis.MANUAL_CORRECTION
        instance.provider = "manual_correction"
        instance.save()
        return instance


class NarrativeAnalysisRequestSerializer(serializers.Serializer):
    manualNotes = serializers.CharField(required=False, allow_blank=True)
    forceRefresh = serializers.BooleanField(required=False, default=False)
    provider = serializers.ChoiceField(
        choices=["local_heuristic", "external_ai"],
        required=False,
        default="local_heuristic",
    )


class NarrativeAnalysisListSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    results = NarrativeAnalysisSerializer(many=True)


class NarrativeMediaRequestSerializer(serializers.Serializer):
    mediaItemId = serializers.PrimaryKeyRelatedField(
        queryset=MediaItem.objects.none(),
        required=False,
    )
