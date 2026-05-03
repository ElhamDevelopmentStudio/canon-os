from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from typing import TYPE_CHECKING

from django.db import transaction

from canonos.adaptations.models import AdaptationRelation
from canonos.aftertaste.models import AftertasteEntry
from canonos.anti_generic.models import AntiGenericEvaluation, AntiGenericRule
from canonos.candidates.models import Candidate, CandidateEvaluation
from canonos.canon.models import CanonSeason, CanonSeasonItem
from canonos.council.models import CouncilSession, CriticPersona
from canonos.detox.models import DetoxDecision, DetoxRule
from canonos.discovery.models import DiscoveryTrail
from canonos.evolution.models import TasteEvolutionSnapshot
from canonos.graph.models import GraphEdge, GraphNode
from canonos.imports.models import ExportJob, ImportBatch, ImportItem
from canonos.jobs.models import BackgroundJob
from canonos.media.models import MediaItem
from canonos.metadata.models import ExternalMetadata
from canonos.narrative.models import NarrativeAnalysis
from canonos.queueing.models import QueueItem, TonightModeSession
from canonos.taste.models import MediaScore, TasteDimension
from canonos.taste.services import seed_default_taste_dimensions

if TYPE_CHECKING:
    from django.contrib.auth.models import User
    from django.db.models import QuerySet


@dataclass(frozen=True, slots=True)
class DataDeletionResult:
    deleted_counts: dict[str, int]

    @property
    def total_deleted(self) -> int:
        return sum(self.deleted_counts.values())


def _count(queryset: QuerySet) -> int:
    return int(queryset.count())


def _delete(queryset: QuerySet) -> None:
    queryset.delete()


def personal_data_counts(user: User) -> dict[str, int]:
    media_items = MediaItem.objects.filter(owner=user)
    candidates = Candidate.objects.filter(owner=user)
    canon_seasons = CanonSeason.objects.filter(owner=user)
    import_batches = ImportBatch.objects.filter(owner=user)
    taste_dimensions = TasteDimension.objects.filter(owner=user)
    graph_nodes = GraphNode.objects.filter(owner=user)
    detox_rules = DetoxRule.objects.filter(owner=user)
    return {
        "mediaItems": _count(media_items),
        "mediaScores": _count(MediaScore.objects.filter(media_item__owner=user)),
        "externalMetadata": _count(ExternalMetadata.objects.filter(media_item__owner=user)),
        "aftertasteEntries": _count(AftertasteEntry.objects.filter(owner=user)),
        "candidates": _count(candidates),
        "candidateEvaluations": _count(CandidateEvaluation.objects.filter(candidate__owner=user)),
        "queueItems": _count(QueueItem.objects.filter(owner=user)),
        "tonightModeSessions": _count(TonightModeSession.objects.filter(owner=user)),
        "tasteDimensions": _count(taste_dimensions),
        "graphNodes": _count(graph_nodes),
        "graphEdges": _count(GraphEdge.objects.filter(owner=user)),
        "importBatches": _count(import_batches),
        "importItems": _count(ImportItem.objects.filter(batch__owner=user)),
        "exportJobs": _count(ExportJob.objects.filter(owner=user)),
        "backgroundJobs": _count(BackgroundJob.objects.filter(owner=user)),
        "adaptationRelations": _count(AdaptationRelation.objects.filter(owner=user)),
        "narrativeAnalyses": _count(NarrativeAnalysis.objects.filter(owner=user)),
        "criticPersonas": _count(CriticPersona.objects.filter(owner=user)),
        "councilSessions": _count(CouncilSession.objects.filter(owner=user)),
        "antiGenericRules": _count(AntiGenericRule.objects.filter(owner=user)),
        "antiGenericEvaluations": _count(
            AntiGenericEvaluation.objects.filter(candidate__owner=user)
        ),
        "detoxRules": _count(detox_rules),
        "detoxDecisions": _count(
            DetoxDecision.objects.filter(media_item__owner=user)
            | DetoxDecision.objects.filter(rule__owner=user)
        ),
        "canonSeasons": _count(canon_seasons),
        "canonSeasonItems": _count(CanonSeasonItem.objects.filter(season__owner=user)),
        "discoveryTrails": _count(DiscoveryTrail.objects.filter(owner=user)),
        "tasteEvolutionSnapshots": _count(TasteEvolutionSnapshot.objects.filter(owner=user)),
    }


def _delete_querysets(querysets: Iterable[tuple[str, QuerySet]]) -> None:
    for _, queryset in querysets:
        _delete(queryset)


@transaction.atomic
def delete_personal_canonos_data(user: User) -> DataDeletionResult:
    deleted_counts = personal_data_counts(user)
    _delete_querysets(
        [
            ("graphEdges", GraphEdge.objects.filter(owner=user)),
            ("graphNodes", GraphNode.objects.filter(owner=user)),
            ("adaptationRelations", AdaptationRelation.objects.filter(owner=user)),
            ("narrativeAnalyses", NarrativeAnalysis.objects.filter(owner=user)),
            ("councilSessions", CouncilSession.objects.filter(owner=user)),
            ("criticPersonas", CriticPersona.objects.filter(owner=user)),
            ("antiGenericEvaluations", AntiGenericEvaluation.objects.filter(candidate__owner=user)),
            ("antiGenericRules", AntiGenericRule.objects.filter(owner=user)),
            ("detoxDecisions", DetoxDecision.objects.filter(media_item__owner=user)),
            ("detoxRules", DetoxRule.objects.filter(owner=user)),
            ("canonSeasons", CanonSeason.objects.filter(owner=user)),
            ("aftertasteEntries", AftertasteEntry.objects.filter(owner=user)),
            ("queueItems", QueueItem.objects.filter(owner=user)),
            ("tonightModeSessions", TonightModeSession.objects.filter(owner=user)),
            ("candidateEvaluations", CandidateEvaluation.objects.filter(candidate__owner=user)),
            ("candidates", Candidate.objects.filter(owner=user)),
            ("mediaScores", MediaScore.objects.filter(media_item__owner=user)),
            ("externalMetadata", ExternalMetadata.objects.filter(media_item__owner=user)),
            ("mediaItems", MediaItem.objects.filter(owner=user)),
            ("discoveryTrails", DiscoveryTrail.objects.filter(owner=user)),
            ("tasteEvolutionSnapshots", TasteEvolutionSnapshot.objects.filter(owner=user)),
            ("importBatches", ImportBatch.objects.filter(owner=user)),
            ("exportJobs", ExportJob.objects.filter(owner=user)),
            ("backgroundJobs", BackgroundJob.objects.filter(owner=user)),
            ("tasteDimensions", TasteDimension.objects.filter(owner=user)),
        ]
    )
    seed_default_taste_dimensions(user)
    return DataDeletionResult(deleted_counts=deleted_counts)
