from __future__ import annotations

from rest_framework import serializers

from .models import TasteEvolutionSnapshot


class TasteEvolutionGenerateSerializer(serializers.Serializer):
    snapshotPeriod = serializers.ChoiceField(
        choices=TasteEvolutionSnapshot.SnapshotPeriod.choices,
        default=TasteEvolutionSnapshot.SnapshotPeriod.MONTHLY,
        required=False,
    )
    snapshotDate = serializers.DateField(required=False)


class TasteEvolutionSnapshotSerializer(serializers.ModelSerializer):
    snapshotPeriod = serializers.CharField(source="snapshot_period")
    snapshotDate = serializers.DateField(source="snapshot_date")
    aggregateData = serializers.JSONField(source="aggregate_data")
    createdAt = serializers.DateTimeField(source="created_at")
    updatedAt = serializers.DateTimeField(source="updated_at")

    class Meta:
        model = TasteEvolutionSnapshot
        fields = (
            "id",
            "snapshotPeriod",
            "snapshotDate",
            "aggregateData",
            "insights",
            "createdAt",
            "updatedAt",
        )


class TasteEvolutionTimelineSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    next = serializers.CharField(allow_null=True)
    previous = serializers.CharField(allow_null=True)
    results = TasteEvolutionSnapshotSerializer(many=True)
