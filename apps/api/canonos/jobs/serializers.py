from __future__ import annotations

from rest_framework import serializers

from .models import BackgroundJob


class BackgroundJobSerializer(serializers.ModelSerializer):
    jobType = serializers.CharField(source="job_type")
    progressTotal = serializers.IntegerField(source="progress_total")
    progressProcessed = serializers.IntegerField(source="progress_processed")
    progressPercent = serializers.IntegerField(source="progress_percent")
    sourceId = serializers.UUIDField(source="source_id", allow_null=True)
    sourceLabel = serializers.CharField(source="source_label", allow_blank=True)
    createdAt = serializers.DateTimeField(source="created_at")
    completedAt = serializers.DateTimeField(source="completed_at", allow_null=True)

    class Meta:
        model = BackgroundJob
        fields = [
            "id",
            "jobType",
            "status",
            "progressTotal",
            "progressProcessed",
            "progressPercent",
            "message",
            "result",
            "sourceId",
            "sourceLabel",
            "createdAt",
            "completedAt",
        ]
