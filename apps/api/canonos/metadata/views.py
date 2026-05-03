from __future__ import annotations

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from canonos.media.models import MediaItem
from canonos.metadata.models import ExternalMetadata
from canonos.metadata.serializers import (
    ExternalMediaMatchSerializer,
    ExternalMetadataSerializer,
    MetadataMatchListSerializer,
    MetadataRefreshJobSerializer,
    MetadataSearchQuerySerializer,
)
from canonos.metadata.services import (
    attach_metadata_to_media,
    match_from_dict,
    match_to_dict,
    refresh_job_payload,
    refresh_metadata_with_job,
    search_metadata_matches,
)


@extend_schema(
    parameters=[
        OpenApiParameter("query", str, description="Title or external lookup query."),
        OpenApiParameter("mediaType", str, description="Optional CanonOS media type filter."),
        OpenApiParameter("provider", str, description="Optional provider filter."),
    ],
    responses=MetadataMatchListSerializer,
    summary="Search external metadata providers",
    description=(
        "Returns normalized metadata matches without sending personal ratings, "
        "notes, or taste data."
    ),
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def metadata_matches(request):  # noqa: ANN001, ANN201
    query_serializer = MetadataSearchQuerySerializer(data=request.query_params)
    query_serializer.is_valid(raise_exception=True)
    matches = search_metadata_matches(
        query=query_serializer.validated_data["query"],
        media_type=query_serializer.validated_data.get("mediaType") or None,
        provider_name=query_serializer.validated_data.get("provider") or None,
    )
    payload = {"count": len(matches), "results": [match_to_dict(match) for match in matches]}
    return Response(MetadataMatchListSerializer(payload).data)


@extend_schema(
    request=ExternalMediaMatchSerializer,
    responses=ExternalMetadataSerializer,
    summary="Attach external metadata to media item",
    description="Stores a provider snapshot for one authenticated user's media item.",
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def attach_media_metadata(request, media_item_id):  # noqa: ANN001, ANN201
    media_item = get_object_or_404(MediaItem, id=media_item_id, owner=request.user)
    serializer = ExternalMediaMatchSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    metadata = attach_metadata_to_media(
        media_item=media_item,
        match=match_from_dict(serializer.validated_data),
    )
    return Response(ExternalMetadataSerializer(metadata).data, status=status.HTTP_201_CREATED)


@extend_schema(
    request=None,
    responses=MetadataRefreshJobSerializer,
    summary="Refresh attached external metadata",
    description="Refreshes an attached provider snapshot through the configured adapter.",
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def refresh_media_metadata(request, media_item_id):  # noqa: ANN001, ANN201
    media_item = get_object_or_404(MediaItem, id=media_item_id, owner=request.user)
    metadata = media_item.external_metadata.order_by("-last_refreshed_at").first()
    if metadata is None:
        return Response(
            {"detail": "Attach external metadata before refreshing it."},
            status=status.HTTP_404_NOT_FOUND,
        )
    refreshed, job = refresh_metadata_with_job(metadata)
    payload = refresh_job_payload(
        refreshed,
        status="failed" if job.status == "failed" else "succeeded",
        message=job.message or "Metadata refreshed.",
        job_id=job.id,
        queued_at=job.created_at,
    )
    return Response(MetadataRefreshJobSerializer(payload).data, status=status.HTTP_201_CREATED)


@extend_schema(
    responses=ExternalMetadataSerializer(many=True),
    summary="List attached media metadata snapshots",
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_media_metadata(request, media_item_id):  # noqa: ANN001, ANN201
    media_item = get_object_or_404(MediaItem, id=media_item_id, owner=request.user)
    queryset = ExternalMetadata.objects.filter(media_item=media_item)
    return Response(ExternalMetadataSerializer(queryset, many=True).data)
