from __future__ import annotations

from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DiscoveryTrail
from .serializers import (
    DiscoveryGenerateResponseSerializer,
    DiscoverySearchRequestSerializer,
    DiscoveryTrailSerializer,
)
from .services import build_search, generate_discovery_trail


class DiscoveryGenerateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=DiscoverySearchRequestSerializer,
        responses={200: DiscoveryGenerateResponseSerializer},
        summary="Generate a Media Archaeologist discovery trail",
        description=(
            "Generate an unsaved, explainable deep-cut discovery trail from theme, mood, era, "
            "country/language, medium, creator, narrative pattern, favorite work, or source media."
        ),
    )
    def post(self, request):  # noqa: ANN001, ANN201
        serializer = DiscoverySearchRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        search = build_search(serializer.validated_data)
        payload = generate_discovery_trail(request.user, search)
        return Response(payload)


@extend_schema_view(
    list=extend_schema(
        parameters=[OpenApiParameter("search", str, description="Search saved trail name/theme.")],
        summary="List saved discovery trails",
        description="List current user's saved Media Archaeologist trails.",
    ),
    retrieve=extend_schema(
        summary="Get saved discovery trail",
        description="Fetch one owner-scoped saved discovery trail.",
    ),
    create=extend_schema(
        request=DiscoveryTrailSerializer,
        responses={201: DiscoveryTrailSerializer},
        summary="Save discovery trail",
        description="Persist a generated Media Archaeologist trail for the authenticated user.",
    ),
    destroy=extend_schema(
        summary="Delete saved discovery trail",
        description="Delete one owner-scoped saved discovery trail.",
    ),
)
class DiscoveryTrailViewSet(viewsets.ModelViewSet):
    queryset = DiscoveryTrail.objects.none()
    serializer_class = DiscoveryTrailSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):  # noqa: ANN201
        queryset = DiscoveryTrail.objects.filter(owner=self.request.user).select_related(
            "source_media_item"
        )
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(name__icontains=search) | queryset.filter(
                theme__icontains=search
            )
        return queryset.order_by("-created_at", "name")

    def create(self, request, *args, **kwargs):  # noqa: ANN001, ANN002, ANN003, ANN201
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        trail = serializer.save(owner=request.user)
        response_serializer = self.get_serializer(trail)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
