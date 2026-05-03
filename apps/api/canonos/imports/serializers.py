from __future__ import annotations

from rest_framework import serializers

from .models import ExportJob, ImportBatch, ImportItem


class ImportPreviewRequestSerializer(serializers.Serializer):
    sourceType = serializers.ChoiceField(
        source="source_type", choices=ImportBatch.SourceType.choices
    )
    file = serializers.FileField(required=False)
    content = serializers.CharField(required=False, allow_blank=False)

    def validate(self, attrs):  # noqa: ANN001, ANN201
        if not attrs.get("file") and not attrs.get("content"):
            raise serializers.ValidationError("Upload a file or provide content.")
        return attrs


class ImportItemPreviewSerializer(serializers.ModelSerializer):
    rowNumber = serializers.IntegerField(source="row_number")
    createdMediaItemId = serializers.UUIDField(source="created_media_item_id", allow_null=True)
    duplicateOfMediaItemId = serializers.UUIDField(
        source="duplicate_of_media_item_id", allow_null=True
    )
    createdObjectId = serializers.UUIDField(source="created_object_id", allow_null=True)

    class Meta:
        model = ImportItem
        fields = [
            "id",
            "rowNumber",
            "kind",
            "status",
            "action",
            "title",
            "payload",
            "errors",
            "warnings",
            "createdMediaItemId",
            "duplicateOfMediaItemId",
            "createdObjectId",
        ]


class ImportBatchSerializer(serializers.ModelSerializer):
    sourceType = serializers.CharField(source="source_type")
    originalFilename = serializers.CharField(source="original_filename")
    uploadedFileReference = serializers.CharField(source="uploaded_file_reference")
    fileSizeBytes = serializers.IntegerField(source="file_size_bytes")
    validCount = serializers.IntegerField(source="valid_count")
    invalidCount = serializers.IntegerField(source="invalid_count")
    duplicateCount = serializers.IntegerField(source="duplicate_count")
    warningsCount = serializers.IntegerField(source="warnings_count")
    createdCount = serializers.IntegerField(source="created_count")
    progressTotal = serializers.IntegerField(source="progress_total")
    progressProcessed = serializers.IntegerField(source="progress_processed")
    progressPercent = serializers.IntegerField(source="progress_percent")
    errorMessage = serializers.CharField(source="error_message", allow_blank=True)
    rollbackItemCount = serializers.IntegerField(source="rollback_item_count")
    rollbackErrorMessage = serializers.CharField(source="rollback_error_message", allow_blank=True)
    createdAt = serializers.DateTimeField(source="created_at")
    confirmedAt = serializers.DateTimeField(source="confirmed_at", allow_null=True)
    processedAt = serializers.DateTimeField(source="processed_at", allow_null=True)
    rolledBackAt = serializers.DateTimeField(source="rolled_back_at", allow_null=True)
    items = ImportItemPreviewSerializer(many=True, read_only=True)

    class Meta:
        model = ImportBatch
        fields = [
            "id",
            "sourceType",
            "originalFilename",
            "uploadedFileReference",
            "fileSizeBytes",
            "status",
            "validCount",
            "invalidCount",
            "duplicateCount",
            "warningsCount",
            "createdCount",
            "progressTotal",
            "progressProcessed",
            "progressPercent",
            "errorMessage",
            "rollbackItemCount",
            "rollbackErrorMessage",
            "createdAt",
            "confirmedAt",
            "processedAt",
            "rolledBackAt",
            "items",
        ]


class ImportRollbackResultSerializer(serializers.Serializer):
    batch = ImportBatchSerializer()
    removedCount = serializers.IntegerField()
    mediaItemsRemoved = serializers.IntegerField()
    candidatesRemoved = serializers.IntegerField()
    queueItemsRemoved = serializers.IntegerField()


class ExportRequestSerializer(serializers.Serializer):
    format = serializers.ChoiceField(choices=ExportJob.Format.choices)


class ExportRestoreDryRunRequestSerializer(serializers.Serializer):
    file = serializers.FileField(required=False)
    content = serializers.CharField(required=False, allow_blank=False)

    def validate(self, attrs):  # noqa: ANN001, ANN201
        if not attrs.get("file") and not attrs.get("content"):
            raise serializers.ValidationError("Upload a JSON backup or provide content.")
        return attrs


class ExportRestoreDryRunResultSerializer(serializers.Serializer):
    version = serializers.CharField()
    isValid = serializers.BooleanField()
    totalCount = serializers.IntegerField()
    validCount = serializers.IntegerField()
    invalidCount = serializers.IntegerField()
    duplicateCount = serializers.IntegerField()
    warningsCount = serializers.IntegerField()
    countsByKind = serializers.DictField(child=serializers.IntegerField())
    errors = serializers.ListField(child=serializers.CharField())
    warnings = serializers.ListField(child=serializers.CharField())


class ExportResultSerializer(serializers.ModelSerializer):
    recordCount = serializers.IntegerField(source="record_count")
    progressTotal = serializers.IntegerField(source="progress_total")
    progressProcessed = serializers.IntegerField(source="progress_processed")
    progressPercent = serializers.IntegerField(source="progress_percent")
    fileSizeBytes = serializers.IntegerField(source="file_size_bytes")
    retentionExpiresAt = serializers.DateTimeField(source="retention_expires_at", allow_null=True)
    restoreValidation = serializers.JSONField(source="restore_validation")
    errorMessage = serializers.CharField(source="error_message", allow_blank=True)
    downloadUrl = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source="created_at")
    processedAt = serializers.DateTimeField(source="processed_at", allow_null=True)

    class Meta:
        model = ExportJob
        fields = [
            "id",
            "format",
            "status",
            "filename",
            "content_type",
            "recordCount",
            "progressTotal",
            "progressProcessed",
            "progressPercent",
            "fileSizeBytes",
            "retentionExpiresAt",
            "restoreValidation",
            "errorMessage",
            "downloadUrl",
            "createdAt",
            "processedAt",
        ]

    def get_downloadUrl(self, obj: ExportJob) -> str:  # noqa: N802
        return f"/api/exports/{obj.id}/download/"
