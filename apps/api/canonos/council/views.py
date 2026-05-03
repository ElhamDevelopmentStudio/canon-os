from __future__ import annotations

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from canonos.candidates.models import Candidate
from canonos.common.throttles import ExpensiveEndpointThrottle
from canonos.media.models import MediaItem

from .models import CouncilSession, CriticPersona
from .serializers import (
    CouncilApplyResponseSerializer,
    CouncilSessionCreateSerializer,
    CouncilSessionSerializer,
    CriticPersonaSerializer,
)
from .services import (
    apply_council_decision,
    get_personas_for_user,
    reset_personas_for_user,
    run_council_session,
)


@extend_schema_view(
    list=extend_schema(
        summary="List Critic Council personas",
        description="List the authenticated user's owner-scoped critic personas in display order.",
    ),
    retrieve=extend_schema(
        summary="Get Critic Council persona",
        description="Fetch one owner-scoped critic persona.",
    ),
    partial_update=extend_schema(
        summary="Update Critic Council persona",
        description="Patch the enabled flag or weight for one critic persona.",
    ),
)
class CriticPersonaViewSet(viewsets.ModelViewSet):
    queryset = CriticPersona.objects.none()
    serializer_class = CriticPersonaSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "post", "head", "options"]

    def get_queryset(self):  # noqa: ANN201
        get_personas_for_user(self.request.user)
        return CriticPersona.objects.filter(owner=self.request.user).order_by("sort_order", "name")

    @extend_schema(
        request=None,
        responses=CriticPersonaSerializer(many=True),
        summary="Reset Critic Council personas",
        description="Restore the authenticated user's critic personas to CanonOS defaults.",
    )
    @action(detail=False, methods=["post"])
    def reset(self, request):  # noqa: ANN001, ANN201
        personas = reset_personas_for_user(request.user)
        return Response({"results": CriticPersonaSerializer(personas, many=True).data})


@extend_schema_view(
    list=extend_schema(
        parameters=[
            OpenApiParameter("candidateId", str, description="Filter sessions by candidate ID."),
            OpenApiParameter("mediaItemId", str, description="Filter sessions by media item ID."),
        ],
        summary="List Critic Council sessions",
        description=(
            "List current user's council sessions, optionally scoped to a candidate "
            "or media item."
        ),
    ),
    retrieve=extend_schema(
        summary="Get Critic Council session",
        description="Fetch one owner-scoped council session.",
    ),
    create=extend_schema(
        request=CouncilSessionCreateSerializer,
        responses={201: CouncilSessionSerializer},
        summary="Run Critic Council",
        description="Generate deterministic critic opinions and a synthesized final decision.",
    ),
)
class CouncilSessionViewSet(viewsets.ModelViewSet):
    queryset = CouncilSession.objects.none()
    serializer_class = CouncilSessionSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]

    def get_throttles(self):  # noqa: ANN201
        if self.action == "create":
            return [ExpensiveEndpointThrottle()]
        return super().get_throttles()

    def get_queryset(self):  # noqa: ANN201
        queryset = CouncilSession.objects.filter(owner=self.request.user).select_related(
            "candidate",
            "media_item",
        )
        candidate_id = self.request.query_params.get("candidateId")
        media_item_id = self.request.query_params.get("mediaItemId")
        if candidate_id:
            queryset = queryset.filter(candidate_id=candidate_id)
        if media_item_id:
            queryset = queryset.filter(media_item_id=media_item_id)
        return queryset.order_by("-created_at")

    def create(self, request, *args, **kwargs):  # noqa: ANN001, ANN002, ANN003, ANN201
        serializer = CouncilSessionCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        candidate = None
        media_item = None
        candidate_id = serializer.validated_data.get("candidateId")
        media_item_id = serializer.validated_data.get("mediaItemId")
        if candidate_id:
            candidate = get_object_or_404(Candidate, owner=request.user, id=candidate_id)
        if media_item_id:
            media_item = get_object_or_404(MediaItem, owner=request.user, id=media_item_id)
        try:
            session = run_council_session(
                owner=request.user,
                prompt=serializer.validated_data.get("prompt", ""),
                candidate=candidate,
                media_item=media_item,
            )
        except ValueError as error:
            return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(CouncilSessionSerializer(session).data, status=status.HTTP_201_CREATED)

    @extend_schema(
        request=None,
        responses={200: CouncilApplyResponseSerializer},
        summary="Apply Critic Council decision to candidate",
        description="Mark the selected candidate with the council session's final decision.",
    )
    @action(detail=True, methods=["post"], url_path="apply-to-candidate")
    def apply_to_candidate(self, request, pk=None):  # noqa: ANN001, ANN201
        session = self.get_object()
        candidate = apply_council_decision(session)
        session.refresh_from_db()
        return Response(
            CouncilApplyResponseSerializer({"session": session, "candidate": candidate}).data,
        )
