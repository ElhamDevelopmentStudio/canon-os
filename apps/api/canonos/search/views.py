from __future__ import annotations

from typing import Any

from django.db.models import Q
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from canonos.candidates.models import Candidate
from canonos.canon.models import CanonSeason
from canonos.media.models import MediaItem
from canonos.queueing.models import QueueItem

from .serializers import UnifiedSearchResponseSerializer

MAX_SEARCH_LIMIT = 10
DEFAULT_SEARCH_LIMIT = 5


class UnifiedSearchView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[
            OpenApiParameter("q", str, description="Search query."),
            OpenApiParameter(
                "limit",
                int,
                description="Maximum results per content type. Defaults to 5, max 10.",
            ),
        ],
        responses={200: UnifiedSearchResponseSerializer},
        summary="Search CanonOS globally",
        description=(
            "Search the authenticated user's library media, candidates, queue items, "
            "and personal canon seasons for command-palette navigation."
        ),
    )
    def get(self, request):  # noqa: ANN001, ANN201
        query = request.query_params.get("q", "").strip()
        limit = _parse_limit(request.query_params.get("limit"))
        if not query:
            return Response({"query": query, "count": 0, "results": []})

        results: list[dict[str, Any]] = []
        results.extend(_media_results(request.user, query, limit))
        results.extend(_candidate_results(request.user, query, limit))
        results.extend(_queue_results(request.user, query, limit))
        results.extend(_canon_season_results(request.user, query, limit))
        return Response({"query": query, "count": len(results), "results": results})


def _parse_limit(raw_limit: str | None) -> int:
    if raw_limit is None:
        return DEFAULT_SEARCH_LIMIT
    try:
        limit = int(raw_limit)
    except ValueError:
        return DEFAULT_SEARCH_LIMIT
    return max(1, min(limit, MAX_SEARCH_LIMIT))


def _media_results(user, query: str, limit: int) -> list[dict[str, Any]]:  # noqa: ANN001
    queryset = (
        MediaItem.objects.filter(owner=user)
        .filter(
            Q(title__icontains=query)
            | Q(original_title__icontains=query)
            | Q(creator__icontains=query)
            | Q(notes__icontains=query)
        )
        .order_by("-updated_at", "title")[:limit]
    )
    return [
        {
            "id": item.id,
            "type": "media",
            "title": item.title,
            "subtitle": "Library item",
            "description": _compact_description(
                item.creator,
                str(item.release_year) if item.release_year else "",
                item.status.replace("_", " "),
            ),
            "targetUrl": f"/library/{item.id}",
            "metadata": {"mediaType": item.media_type, "status": item.status},
        }
        for item in queryset
    ]


def _candidate_results(user, query: str, limit: int) -> list[dict[str, Any]]:  # noqa: ANN001
    queryset = (
        Candidate.objects.filter(owner=user)
        .filter(
            Q(title__icontains=query)
            | Q(known_creator__icontains=query)
            | Q(premise__icontains=query)
            | Q(source_of_interest__icontains=query)
        )
        .order_by("-updated_at", "title")[:limit]
    )
    return [
        {
            "id": candidate.id,
            "type": "candidate",
            "title": candidate.title,
            "subtitle": "Candidate",
            "description": _compact_description(
                candidate.known_creator,
                str(candidate.release_year) if candidate.release_year else "",
                candidate.status.replace("_", " "),
            ),
            "targetUrl": f"/candidates?candidateId={candidate.id}",
            "metadata": {"mediaType": candidate.media_type, "status": candidate.status},
        }
        for candidate in queryset
    ]


def _queue_results(user, query: str, limit: int) -> list[dict[str, Any]]:  # noqa: ANN001
    queryset = (
        QueueItem.objects.filter(owner=user)
        .filter(
            Q(title__icontains=query) | Q(reason__icontains=query) | Q(best_mood__icontains=query)
        )
        .order_by("is_archived", "queue_position", "-updated_at", "title")[:limit]
    )
    return [
        {
            "id": item.id,
            "type": "queue_item",
            "title": item.title,
            "subtitle": "Queue item",
            "description": _compact_description(
                item.priority.replace("_", " "),
                item.best_mood,
                "archived" if item.is_archived else "active",
            ),
            "targetUrl": f"/queue?queueItemId={item.id}",
            "metadata": {
                "mediaType": item.media_type,
                "priority": item.priority,
                "isArchived": item.is_archived,
            },
        }
        for item in queryset
    ]


def _canon_season_results(user, query: str, limit: int) -> list[dict[str, Any]]:  # noqa: ANN001
    queryset = (
        CanonSeason.objects.filter(owner=user)
        .filter(
            Q(title__icontains=query)
            | Q(theme__icontains=query)
            | Q(description__icontains=query)
            | Q(reflection_notes__icontains=query)
        )
        .order_by("-updated_at", "title")[:limit]
    )
    return [
        {
            "id": season.id,
            "type": "canon_season",
            "title": season.title,
            "subtitle": "Canon season",
            "description": _compact_description(
                season.get_theme_display(),
                season.status,
                f"{season.items.count()} items",
            ),
            "targetUrl": f"/seasons/{season.id}",
            "metadata": {"theme": season.theme, "status": season.status},
        }
        for season in queryset
    ]


def _compact_description(*parts: str) -> str:
    return " · ".join(part for part in parts if part)
