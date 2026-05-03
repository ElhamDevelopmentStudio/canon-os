from __future__ import annotations

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from canonos.candidates.models import Candidate, CandidateEvaluation
from canonos.candidates.serializers import CandidateSerializer
from canonos.media.models import MediaItem

from .models import CouncilSession, CriticPersona


class CriticPersonaSerializer(serializers.ModelSerializer):
    isEnabled = serializers.BooleanField(source="is_enabled", required=False)
    sortOrder = serializers.IntegerField(source="sort_order", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = CriticPersona
        fields = [
            "id",
            "key",
            "name",
            "role",
            "description",
            "weight",
            "isEnabled",
            "sortOrder",
            "createdAt",
            "updatedAt",
        ]
        read_only_fields = [
            "id",
            "key",
            "name",
            "role",
            "description",
            "sortOrder",
            "createdAt",
            "updatedAt",
        ]


class CriticOpinionSerializer(serializers.Serializer):
    personaId = serializers.UUIDField()
    role = serializers.ChoiceField(choices=CriticPersona.Role.choices)
    name = serializers.CharField()
    description = serializers.CharField()
    weight = serializers.IntegerField(min_value=0, max_value=100)
    recommendation = serializers.ChoiceField(choices=CandidateEvaluation.Decision.choices)
    recommendationLabel = serializers.CharField()
    confidence = serializers.IntegerField(min_value=0, max_value=100)
    stance = serializers.CharField()
    argument = serializers.CharField()
    reason = serializers.CharField()
    evidence = serializers.ListField(child=serializers.CharField())


class CouncilFinalDecisionSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=CandidateEvaluation.Decision.choices)
    label = serializers.CharField()
    confidenceScore = serializers.IntegerField(min_value=0, max_value=100)
    disagreementScore = serializers.IntegerField(min_value=0, max_value=100)
    explanation = serializers.CharField()
    appliedToCandidate = serializers.BooleanField()


class CouncilSessionSerializer(serializers.ModelSerializer):
    candidateId = serializers.UUIDField(source="candidate_id", read_only=True, allow_null=True)
    candidateTitle = serializers.SerializerMethodField()
    mediaItemId = serializers.UUIDField(source="media_item_id", read_only=True, allow_null=True)
    mediaItemTitle = serializers.SerializerMethodField()
    criticOpinions = CriticOpinionSerializer(source="critic_opinions", many=True, read_only=True)
    finalDecision = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = CouncilSession
        fields = [
            "id",
            "candidateId",
            "candidateTitle",
            "mediaItemId",
            "mediaItemTitle",
            "prompt",
            "context",
            "criticOpinions",
            "finalDecision",
            "createdAt",
            "updatedAt",
        ]
        read_only_fields = fields

    def get_candidateTitle(self, obj: CouncilSession) -> str | None:  # noqa: N802
        return obj.candidate.title if obj.candidate else None

    def get_mediaItemTitle(self, obj: CouncilSession) -> str | None:  # noqa: N802
        return obj.media_item.title if obj.media_item else None

    @extend_schema_field(CouncilFinalDecisionSerializer)
    def get_finalDecision(self, obj: CouncilSession) -> dict[str, object]:  # noqa: N802
        return {
            "decision": obj.final_decision,
            "label": obj.get_final_decision_display(),
            "confidenceScore": obj.confidence_score,
            "disagreementScore": obj.disagreement_score,
            "explanation": obj.final_explanation,
            "appliedToCandidate": obj.applied_to_candidate,
        }


class CouncilSessionCreateSerializer(serializers.Serializer):
    prompt = serializers.CharField(required=False, allow_blank=True)
    candidateId = serializers.UUIDField(required=False, allow_null=True)
    mediaItemId = serializers.UUIDField(required=False, allow_null=True)

    def validate(self, attrs: dict[str, object]) -> dict[str, object]:
        has_no_target = not attrs.get("candidateId") and not attrs.get("mediaItemId")
        if has_no_target and not attrs.get("prompt", ""):
            raise serializers.ValidationError(
                "Add a prompt, candidate, or media item before running Critic Council."
            )
        request = self.context["request"]
        candidate_id = attrs.get("candidateId")
        media_item_id = attrs.get("mediaItemId")
        if (
            candidate_id
            and not Candidate.objects.filter(owner=request.user, id=candidate_id).exists()
        ):
            raise serializers.ValidationError({"candidateId": "Candidate not found."})
        if (
            media_item_id
            and not MediaItem.objects.filter(owner=request.user, id=media_item_id).exists()
        ):
            raise serializers.ValidationError({"mediaItemId": "Media item not found."})
        return attrs


class CouncilApplyResponseSerializer(serializers.Serializer):
    session = CouncilSessionSerializer()
    candidate = CandidateSerializer(allow_null=True)
