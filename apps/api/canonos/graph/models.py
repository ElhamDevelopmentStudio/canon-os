from __future__ import annotations

import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class GraphNode(models.Model):
    class NodeType(models.TextChoices):
        MEDIA = "media", "Media"
        CREATOR = "creator", "Creator"
        DIMENSION = "dimension", "Dimension"
        AFTERTASTE_SIGNAL = "aftertaste_signal", "Aftertaste signal"
        THEME = "theme", "Theme"
        TAG = "tag", "Tag"
        MEDIUM = "medium", "Medium"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="graph_nodes",
    )
    node_type = models.CharField(max_length=32, choices=NodeType.choices)
    label = models.CharField(max_length=255)
    slug = models.SlugField(max_length=160)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["node_type", "label"]
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "node_type", "slug"],
                name="graph_node_owner_type_slug_uniq",
            ),
        ]
        indexes = [
            models.Index(fields=["owner", "node_type"], name="graph_node_owner_type_idx"),
            models.Index(fields=["slug"], name="graph_node_slug_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.get_node_type_display()}: {self.label}"


class GraphEdge(models.Model):
    class EdgeType(models.TextChoices):
        CREATED_BY = "created_by", "Created by"
        DIMENSION_SIGNAL = "dimension_signal", "Dimension signal"
        AFTERTASTE_SIGNAL = "aftertaste_signal", "Aftertaste signal"
        MEDIUM_SIGNAL = "medium_signal", "Medium signal"
        TAGGED_AS = "tagged_as", "Tagged as"
        THEME_SIGNAL = "theme_signal", "Theme signal"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="graph_edges",
    )
    source_node = models.ForeignKey(
        GraphNode,
        on_delete=models.CASCADE,
        related_name="outgoing_edges",
    )
    target_node = models.ForeignKey(
        GraphNode,
        on_delete=models.CASCADE,
        related_name="incoming_edges",
    )
    edge_type = models.CharField(max_length=32, choices=EdgeType.choices)
    weight = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        validators=[MinValueValidator(-1), MaxValueValidator(1)],
    )
    evidence = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["edge_type", "source_node__label", "target_node__label"]
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "source_node", "target_node", "edge_type"],
                name="graph_edge_owner_nodes_type_uniq",
            ),
        ]
        indexes = [
            models.Index(fields=["owner", "edge_type"], name="graph_edge_owner_type_idx"),
            models.Index(fields=["source_node"], name="graph_edge_source_idx"),
            models.Index(fields=["target_node"], name="graph_edge_target_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.source_node} -[{self.edge_type}]-> {self.target_node}"
