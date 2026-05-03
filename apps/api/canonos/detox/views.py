from __future__ import annotations

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from canonos.media.models import MediaItem

from .models import DetoxDecision, DetoxRule
from .serializers import (
    DetoxDecisionListSerializer,
    DetoxDecisionSerializer,
    DetoxEvaluateRequestSerializer,
    DetoxEvaluateResponseSerializer,
    DetoxRuleListSerializer,
    DetoxRuleSerializer,
    DetoxTimeSavedSummarySerializer,
)
from .services import (
    evaluate_detox,
    get_rules_for_user,
    get_time_saved_summary,
    reset_rules_for_user,
)


class DetoxRuleViewSet(viewsets.ModelViewSet):
    queryset = DetoxRule.objects.none()
    serializer_class = DetoxRuleSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "post", "head", "options"]

    def create(self, request, *args, **kwargs):  # noqa: ANN001, ANN002, ANN003, ANN201
        return Response(
            {"detail": "Use reset or patch existing default rules."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def get_queryset(self):  # noqa: ANN201
        get_rules_for_user(self.request.user)
        return DetoxRule.objects.filter(owner=self.request.user).order_by(
            "media_type",
            "sample_limit",
            "name",
        )

    @extend_schema(
        request=None,
        responses=DetoxRuleListSerializer,
        summary="Reset Completion Detox rules",
        description="Restore the authenticated user's Completion Detox rules to CanonOS defaults.",
    )
    @action(detail=False, methods=["post"])
    def reset(self, request):  # noqa: ANN001, ANN201
        rules = reset_rules_for_user(request.user)
        return Response(
            {
                "count": len(rules),
                "next": None,
                "previous": None,
                "results": DetoxRuleSerializer(rules, many=True).data,
            },
        )


class DetoxEvaluateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=DetoxEvaluateRequestSerializer,
        responses={201: DetoxEvaluateResponseSerializer},
        summary="Evaluate Completion Detox decision",
        description=(
            "Evaluate an owned media item against enabled sample rules and record a neutral "
            "drop, pause, or continue decision."
        ),
    )
    def post(self, request):  # noqa: ANN001, ANN201
        serializer = DetoxEvaluateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        media_item = get_object_or_404(
            MediaItem,
            owner=request.user,
            id=serializer.validated_data["mediaItemId"],
        )
        decision = evaluate_detox(
            request.user,
            media_item,
            progress_value=serializer.validated_data["progressValue"],
            motivation_score=serializer.validated_data["motivationScore"],
        )
        return Response(
            DetoxEvaluateResponseSerializer(
                {
                    "decision": decision,
                    "matchedRule": decision.rule,
                    "mediaItem": media_item,
                    "timeSavedSummary": get_time_saved_summary(request.user),
                },
                context={"request": request},
            ).data,
            status=status.HTTP_201_CREATED,
        )


class DetoxDecisionListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses=DetoxDecisionListSerializer,
        summary="List Completion Detox decisions",
        description="Return recent owner-scoped Completion Detox decisions.",
    )
    def get(self, request):  # noqa: ANN001, ANN201
        decisions = DetoxDecision.objects.filter(media_item__owner=request.user).select_related(
            "media_item",
            "rule",
        )
        serializer = DetoxDecisionSerializer(decisions, many=True)
        return Response(
            {
                "count": decisions.count(),
                "next": None,
                "previous": None,
                "results": serializer.data,
            },
        )


class DetoxTimeSavedSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses=DetoxTimeSavedSummarySerializer,
        summary="Get Completion Detox time saved summary",
        description=(
            "Summarize estimated time saved from drop, pause, delay, and archive " "decisions."
        ),
    )
    def get(self, request):  # noqa: ANN001, ANN201
        return Response(get_time_saved_summary(request.user))
