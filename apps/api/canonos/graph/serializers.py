from __future__ import annotations

from rest_framework import serializers

from .models import GraphEdge, GraphNode


class GraphNodeSerializer(serializers.ModelSerializer):
    nodeType = serializers.CharField(source="node_type", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = GraphNode
        fields = ["id", "nodeType", "label", "slug", "metadata", "createdAt", "updatedAt"]
        read_only_fields = fields


class GraphEdgeSerializer(serializers.ModelSerializer):
    sourceNodeId = serializers.UUIDField(source="source_node_id", read_only=True)
    sourceLabel = serializers.CharField(source="source_node.label", read_only=True)
    targetNodeId = serializers.UUIDField(source="target_node_id", read_only=True)
    targetLabel = serializers.CharField(source="target_node.label", read_only=True)
    edgeType = serializers.CharField(source="edge_type", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = GraphEdge
        fields = [
            "id",
            "sourceNodeId",
            "sourceLabel",
            "targetNodeId",
            "targetLabel",
            "edgeType",
            "weight",
            "evidence",
            "createdAt",
            "updatedAt",
        ]
        read_only_fields = fields


class TasteGraphEvidenceCountsSerializer(serializers.Serializer):
    mediaNodeCount = serializers.IntegerField()
    creatorNodeCount = serializers.IntegerField()
    dimensionNodeCount = serializers.IntegerField()
    aftertasteSignalNodeCount = serializers.IntegerField()
    narrativeTraitNodeCount = serializers.IntegerField()
    edgeCount = serializers.IntegerField()


class TasteGraphSummaryItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    label = serializers.CharField()
    nodeType = serializers.CharField()
    mediaType = serializers.CharField(required=False)
    weight = serializers.FloatField()
    evidenceCount = serializers.IntegerField()
    evidenceLabel = serializers.CharField()


class TasteGraphSummarySerializer(serializers.Serializer):
    generatedAt = serializers.DateTimeField()
    isEmpty = serializers.BooleanField()
    nodeCount = serializers.IntegerField()
    edgeCount = serializers.IntegerField()
    evidenceCounts = TasteGraphEvidenceCountsSerializer()
    strongestThemes = TasteGraphSummaryItemSerializer(many=True)
    strongestCreators = TasteGraphSummaryItemSerializer(many=True)
    strongestMedia = TasteGraphSummaryItemSerializer(many=True)
    weakNegativeSignals = TasteGraphSummaryItemSerializer(many=True)
    textGraph = serializers.ListField(child=serializers.CharField())


class GraphRebuildJobSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    status = serializers.ChoiceField(choices=["completed", "failed"])
    message = serializers.CharField()
    nodeCount = serializers.IntegerField()
    edgeCount = serializers.IntegerField()
    startedAt = serializers.DateTimeField()
    finishedAt = serializers.DateTimeField()
