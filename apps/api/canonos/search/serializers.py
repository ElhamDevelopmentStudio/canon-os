from __future__ import annotations

from rest_framework import serializers


class UnifiedSearchResultSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    type = serializers.ChoiceField(
        choices=["media", "candidate", "queue_item", "canon_season"],
    )
    title = serializers.CharField()
    subtitle = serializers.CharField(allow_blank=True)
    description = serializers.CharField(allow_blank=True)
    targetUrl = serializers.CharField()
    metadata = serializers.DictField(child=serializers.JSONField(), required=False)


class UnifiedSearchResponseSerializer(serializers.Serializer):
    query = serializers.CharField(allow_blank=True)
    count = serializers.IntegerField()
    results = UnifiedSearchResultSerializer(many=True)
