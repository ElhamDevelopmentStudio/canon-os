from __future__ import annotations

from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .defaults import DEFAULT_AFTERTASTE_PROMPTS
from .models import AftertasteEntry
from .serializers import AftertasteEntrySerializer, AftertastePromptSerializer


@extend_schema_view(
    list=extend_schema(
        parameters=[OpenApiParameter("mediaItemId", str, description="Filter by media item.")],
        summary="List current user's aftertaste entries",
    ),
    retrieve=extend_schema(summary="Get current user's aftertaste entry"),
    create=extend_schema(summary="Create aftertaste entry"),
    partial_update=extend_schema(summary="Update aftertaste entry"),
    destroy=extend_schema(summary="Delete aftertaste entry"),
)
class AftertasteEntryViewSet(viewsets.ModelViewSet):
    serializer_class = AftertasteEntrySerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):  # noqa: ANN201
        queryset = AftertasteEntry.objects.filter(owner=self.request.user).select_related(
            "media_item"
        )
        media_item_id = self.request.query_params.get("mediaItemId")
        if media_item_id:
            queryset = queryset.filter(media_item_id=media_item_id)
        return queryset.order_by("-created_at")

    def perform_create(self, serializer: AftertasteEntrySerializer) -> None:
        serializer.save(owner=self.request.user)


class AftertastePromptView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: AftertastePromptSerializer(many=True)},
        summary="List default aftertaste prompts",
    )
    def get(self, request):  # noqa: ANN001, ANN201
        return Response(DEFAULT_AFTERTASTE_PROMPTS)
