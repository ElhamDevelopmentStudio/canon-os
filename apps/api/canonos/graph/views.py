from __future__ import annotations

from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import GraphEdge, GraphNode
from .serializers import (
    GraphEdgeSerializer,
    GraphNodeSerializer,
    GraphRebuildJobSerializer,
    TasteGraphSummarySerializer,
)
from .services import build_taste_graph_summary, graph_rebuild_job_payload


class TasteGraphSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses=TasteGraphSummarySerializer,
        summary="Get TasteGraph summary",
        description="Returns the current deterministic graph summary for the authenticated user.",
    )
    def get(self, request):  # noqa: ANN001, ANN201
        return Response(build_taste_graph_summary(request.user))


class GraphNodeListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[OpenApiParameter("nodeType", str, description="Optional node type filter.")],
        responses=GraphNodeSerializer(many=True),
        summary="List TasteGraph nodes",
    )
    def get(self, request):  # noqa: ANN001, ANN201
        queryset = GraphNode.objects.filter(owner=request.user)
        node_type = request.query_params.get("nodeType")
        if node_type:
            queryset = queryset.filter(node_type=node_type)
        return Response({"results": GraphNodeSerializer(queryset, many=True).data})


class GraphEdgeListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[OpenApiParameter("edgeType", str, description="Optional edge type filter.")],
        responses=GraphEdgeSerializer(many=True),
        summary="List TasteGraph edges",
    )
    def get(self, request):  # noqa: ANN001, ANN201
        queryset = GraphEdge.objects.filter(owner=request.user).select_related(
            "source_node",
            "target_node",
        )
        edge_type = request.query_params.get("edgeType")
        if edge_type:
            queryset = queryset.filter(edge_type=edge_type)
        return Response({"results": GraphEdgeSerializer(queryset, many=True).data})


class TasteGraphRebuildView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=None,
        responses=GraphRebuildJobSerializer,
        summary="Rebuild TasteGraph",
        description=(
            "Synchronously rebuilds the user's graph; Celery task mirrors this service "
            "for workers."
        ),
    )
    def post(self, request):  # noqa: ANN001, ANN201
        return Response(
            GraphRebuildJobSerializer(graph_rebuild_job_payload(request.user)).data,
            status=201,
        )
