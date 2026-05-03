from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models


def default_aggregate_data() -> dict[str, object]:
    return {}


class TasteEvolutionSnapshot(models.Model):
    class SnapshotPeriod(models.TextChoices):
        MONTHLY = "monthly", "Monthly"
        QUARTERLY = "quarterly", "Quarterly"
        YEARLY = "yearly", "Yearly"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="taste_evolution_snapshots",
    )
    snapshot_period = models.CharField(
        max_length=16,
        choices=SnapshotPeriod.choices,
        default=SnapshotPeriod.MONTHLY,
    )
    snapshot_date = models.DateField()
    aggregate_data = models.JSONField(default=default_aggregate_data, blank=True)
    insights = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-snapshot_date", "-created_at"]
        indexes = [
            models.Index(fields=["owner", "-snapshot_date"], name="evolution_owner_date_idx"),
            models.Index(fields=["owner", "snapshot_period"], name="evolution_owner_period_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.owner} taste evolution snapshot {self.snapshot_date}"
