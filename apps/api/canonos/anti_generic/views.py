from __future__ import annotations

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from canonos.candidates.models import Candidate
from canonos.common.throttles import ExpensiveEndpointThrottle
from canonos.media.models import MediaItem

from .models import AntiGenericRule
from .serializers import (
    AntiGenericEvaluateRequestSerializer,
    AntiGenericEvaluateResponseSerializer,
    AntiGenericRuleSerializer,
)
from .services import evaluate_anti_generic_for_candidate, get_rules_for_user, reset_rules_for_user


class AntiGenericRuleViewSet(viewsets.ModelViewSet):
    queryset = AntiGenericRule.objects.none()
    serializer_class = AntiGenericRuleSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "post", "head", "options"]

    def get_queryset(self):  # noqa: ANN201
        get_rules_for_user(self.request.user)
        return AntiGenericRule.objects.filter(owner=self.request.user).order_by(
            "is_positive_exception",
            "name",
        )

    @extend_schema(
        request=None,
        responses=AntiGenericRuleSerializer(many=True),
        summary="Reset Anti-Generic rules",
        description="Restore the authenticated user's Anti-Generic rules to CanonOS defaults.",
    )
    @action(detail=False, methods=["post"])
    def reset(self, request):  # noqa: ANN001, ANN201
        rules = reset_rules_for_user(request.user)
        return Response({"results": AntiGenericRuleSerializer(rules, many=True).data})


class AntiGenericEvaluateView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ExpensiveEndpointThrottle]

    @extend_schema(
        request=AntiGenericEvaluateRequestSerializer,
        responses={201: AntiGenericEvaluateResponseSerializer},
        summary="Run Anti-Generic evaluation",
        description=(
            "Evaluate a candidate against owner-scoped red-flag and positive-exception rules."
        ),
    )
    def post(self, request):  # noqa: ANN001, ANN201
        serializer = AntiGenericEvaluateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        candidate = get_object_or_404(
            Candidate,
            owner=request.user,
            id=serializer.validated_data["candidateId"],
        )
        media_item = None
        media_item_id = serializer.validated_data.get("mediaItemId")
        if media_item_id:
            media_item = get_object_or_404(MediaItem, owner=request.user, id=media_item_id)
        evaluation = evaluate_anti_generic_for_candidate(
            request.user,
            candidate,
            media_item=media_item,
        )
        return Response(
            AntiGenericEvaluateResponseSerializer(
                {"evaluation": evaluation, "mediaItem": media_item},
            ).data,
            status=status.HTTP_201_CREATED,
        )
