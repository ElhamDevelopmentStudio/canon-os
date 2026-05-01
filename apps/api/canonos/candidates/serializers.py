from __future__ import annotations

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from canonos.media.models import MediaItem
from canonos.media.serializers import MediaItemSerializer

from .models import Candidate, CandidateEvaluation


class CandidateEvaluationSerializer(serializers.ModelSerializer):
    candidateId = serializers.UUIDField(source="candidate_id", read_only=True)
    confidenceScore = serializers.IntegerField(source="confidence_score", read_only=True)
    likelyFitScore = serializers.IntegerField(source="likely_fit_score", read_only=True)
    riskScore = serializers.IntegerField(source="risk_score", read_only=True)
    reasonsFor = serializers.ListField(
        source="reasons_for",
        child=serializers.CharField(),
        read_only=True,
    )
    reasonsAgainst = serializers.ListField(
        source="reasons_against",
        child=serializers.CharField(),
        read_only=True,
    )
    bestMood = serializers.CharField(source="best_mood", read_only=True)
    recommendedAction = serializers.CharField(source="recommended_action", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = CandidateEvaluation
        fields = [
            "id",
            "candidateId",
            "decision",
            "confidenceScore",
            "likelyFitScore",
            "riskScore",
            "reasonsFor",
            "reasonsAgainst",
            "bestMood",
            "recommendedAction",
            "createdAt",
        ]
        read_only_fields = fields


class CandidateSerializer(serializers.ModelSerializer):
    mediaType = serializers.ChoiceField(source="media_type", choices=MediaItem.MediaType.choices)
    releaseYear = serializers.IntegerField(source="release_year", required=False, allow_null=True)
    knownCreator = serializers.CharField(source="known_creator", required=False, allow_blank=True)
    sourceOfInterest = serializers.CharField(
        source="source_of_interest",
        required=False,
        allow_blank=True,
    )
    hypeLevel = serializers.IntegerField(
        source="hype_level",
        min_value=0,
        max_value=10,
        required=False,
        allow_null=True,
    )
    expectedGenericness = serializers.IntegerField(
        source="expected_genericness",
        min_value=0,
        max_value=10,
        required=False,
        allow_null=True,
    )
    expectedTimeCostMinutes = serializers.IntegerField(
        source="expected_time_cost_minutes",
        min_value=0,
        required=False,
        allow_null=True,
    )
    latestEvaluation = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = Candidate
        fields = [
            "id",
            "title",
            "mediaType",
            "releaseYear",
            "knownCreator",
            "premise",
            "sourceOfInterest",
            "hypeLevel",
            "expectedGenericness",
            "expectedTimeCostMinutes",
            "status",
            "latestEvaluation",
            "createdAt",
            "updatedAt",
        ]
        read_only_fields = ["id", "latestEvaluation", "createdAt", "updatedAt"]

    @extend_schema_field(CandidateEvaluationSerializer(allow_null=True))
    def get_latestEvaluation(self, obj: Candidate):  # noqa: ANN201, N802
        evaluation = obj.evaluations.order_by("-created_at").first()
        return CandidateEvaluationSerializer(evaluation).data if evaluation else None


class CandidateEvaluateSerializer(serializers.Serializer):
    candidate = CandidateSerializer()


class CandidateEvaluateResponseSerializer(serializers.Serializer):
    candidate = CandidateSerializer()
    evaluation = CandidateEvaluationSerializer()


class CandidateAddToLibrarySerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=MediaItem.ConsumptionStatus.choices,
        required=False,
        default=MediaItem.ConsumptionStatus.PLANNED,
    )
    personalRating = serializers.DecimalField(
        source="personal_rating",
        max_digits=3,
        decimal_places=1,
        required=False,
        allow_null=True,
        min_value=0,
        max_value=10,
    )
    notes = serializers.CharField(required=False, allow_blank=True)


class CandidateAddToLibraryResponseSerializer(serializers.Serializer):
    candidate = CandidateSerializer()
    mediaItem = MediaItemSerializer()
