from __future__ import annotations

from django.db import transaction
from django.db.models import Q
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from canonos.media.models import MediaItem

from .models import Candidate
from .serializers import (
    CandidateAddToLibraryResponseSerializer,
    CandidateAddToLibrarySerializer,
    CandidateEvaluateResponseSerializer,
    CandidateEvaluationSerializer,
    CandidateSerializer,
)
from .services import evaluate_candidate


@extend_schema_view(
    list=extend_schema(
        parameters=[
            OpenApiParameter("mediaType", str, description="Filter by media type."),
            OpenApiParameter("status", str, description="Filter by candidate status."),
            OpenApiParameter(
                "search",
                str,
                description="Search title, creator, premise, or source.",
            ),
        ],
        summary="List current user's candidates",
    ),
    retrieve=extend_schema(summary="Get current user's candidate"),
    create=extend_schema(summary="Create candidate"),
    partial_update=extend_schema(summary="Update candidate"),
    destroy=extend_schema(summary="Delete candidate"),
)
class CandidateViewSet(viewsets.ModelViewSet):
    serializer_class = CandidateSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):  # noqa: ANN201
        queryset = Candidate.objects.filter(owner=self.request.user).prefetch_related("evaluations")
        media_type = self.request.query_params.get("mediaType")
        candidate_status = self.request.query_params.get("status")
        search = self.request.query_params.get("search")

        if media_type:
            queryset = queryset.filter(media_type=media_type)
        if candidate_status:
            queryset = queryset.filter(status=candidate_status)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(known_creator__icontains=search)
                | Q(premise__icontains=search)
                | Q(source_of_interest__icontains=search)
            )
        return queryset.order_by("-updated_at", "title")

    def perform_create(self, serializer: CandidateSerializer) -> None:
        serializer.save(owner=self.request.user)

    @extend_schema(
        request=None,
        responses={200: CandidateEvaluateResponseSerializer},
        summary="Evaluate a saved candidate",
    )
    @action(detail=True, methods=["post"])
    def evaluate(self, request, pk=None):  # noqa: ANN001, ANN201
        candidate = self.get_object()
        evaluation = evaluate_candidate(request.user, candidate)
        candidate.refresh_from_db()
        return Response(
            {
                "candidate": CandidateSerializer(candidate).data,
                "evaluation": CandidateEvaluationSerializer(evaluation).data,
            }
        )

    @extend_schema(
        request=CandidateAddToLibrarySerializer,
        responses={201: CandidateAddToLibraryResponseSerializer},
        summary="Add candidate to the media library",
    )
    @action(detail=True, methods=["post"], url_path="add-to-library")
    def add_to_library(self, request, pk=None):  # noqa: ANN001, ANN201
        candidate = self.get_object()
        serializer = CandidateAddToLibrarySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        default_notes = []
        if candidate.source_of_interest:
            default_notes.append(f"Candidate source: {candidate.source_of_interest}")
        if candidate.premise:
            default_notes.append(f"Premise: {candidate.premise}")
        if payload.get("notes"):
            default_notes.append(payload["notes"])

        with transaction.atomic():
            media_item = MediaItem.objects.create(
                owner=request.user,
                title=candidate.title,
                media_type=candidate.media_type,
                release_year=candidate.release_year,
                creator=candidate.known_creator,
                status=payload.get("status", MediaItem.ConsumptionStatus.PLANNED),
                personal_rating=payload.get("personal_rating"),
                notes="\n\n".join(default_notes),
            )
            if candidate.status == Candidate.Status.UNEVALUATED:
                candidate.status = Candidate.Status.WATCH_NOW
                candidate.save(update_fields=["status", "updated_at"])
            else:
                candidate.save(update_fields=["updated_at"])

        return Response(
            CandidateAddToLibraryResponseSerializer(
                {"candidate": candidate, "mediaItem": media_item}
            ).data,
            status=status.HTTP_201_CREATED,
        )
