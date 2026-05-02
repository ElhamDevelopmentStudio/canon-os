from __future__ import annotations

from django.contrib import admin

from .models import GraphEdge, GraphNode


@admin.register(GraphNode)
class GraphNodeAdmin(admin.ModelAdmin):
    list_display = ("label", "node_type", "owner", "updated_at")
    list_filter = ("node_type",)
    search_fields = ("label", "slug", "owner__username", "owner__email")


@admin.register(GraphEdge)
class GraphEdgeAdmin(admin.ModelAdmin):
    list_display = ("source_node", "edge_type", "target_node", "weight", "owner")
    list_filter = ("edge_type",)
    search_fields = ("source_node__label", "target_node__label", "evidence")
