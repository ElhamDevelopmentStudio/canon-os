from __future__ import annotations

from rest_framework import serializers


class HealthCheckSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["ok"])
    service = serializers.CharField()
    version = serializers.CharField()
