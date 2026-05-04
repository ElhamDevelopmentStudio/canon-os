from __future__ import annotations

from drf_spectacular.utils import OpenApiExample, extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

API_ROOT_PAYLOAD = {
    "service": "canonos-api",
    "version": "v1",
    "schemaVersion": "v1",
    "versionedBasePath": "/api/v1/",
    "endpoints": {
        "health": "/api/health/",
        "health_db": "/api/health/db/",
        "health_redis": "/api/health/redis/",
        "health_celery": "/api/health/celery/",
        "health_v1": "/api/v1/health/",
        "auth": "/api/auth/",
        "settings": "/api/auth/settings/",
        "aftertaste": "/api/aftertaste/",
        "adaptation_relations": "/api/adaptations/relations/",
        "analytics_overview": "/api/analytics/",
        "analytics_consumption_timeline": "/api/analytics/consumption-timeline/",
        "analytics_rating_distribution": "/api/analytics/rating-distribution/",
        "analytics_media_type_distribution": "/api/analytics/media-type-distribution/",
        "analytics_dimension_trends": "/api/analytics/dimension-trends/",
        "analytics_genericness_satisfaction": "/api/analytics/genericness-satisfaction/",
        "analytics_regret_time_cost": "/api/analytics/regret-time-cost/",
        "analytics_top_creators": "/api/analytics/top-creators/",
        "analytics_top_themes": "/api/analytics/top-themes/",
        "media_adaptation_map": "/api/media-items/{id}/adaptation-map/",
        "media_adaptation_path": "/api/media-items/{id}/adaptation-path/",
        "anti_generic_rules": "/api/anti-generic/rules/",
        "anti_generic_evaluate": "/api/anti-generic/evaluate/",
        "dashboard_summary": "/api/dashboard/summary/",
        "detox_rules": "/api/detox/rules/",
        "detox_evaluate": "/api/detox/evaluate/",
        "detox_decisions": "/api/detox/decisions/",
        "detox_time_saved": "/api/detox/time-saved/",
        "discovery_generate": "/api/discovery/generate/",
        "discovery_trails": "/api/discovery/trails/",
        "media_items": "/api/media-items/",
        "metadata_matches": "/api/metadata/matches/",
        "narrative_analyses": "/api/narrative-analyses/",
        "media_narrative_analysis": "/api/media-items/{id}/narrative-analysis/",
        "import_preview": "/api/imports/preview/",
        "exports": "/api/exports/",
        "jobs": "/api/jobs/",
        "taste_dimensions": "/api/taste-dimensions/",
        "taste_profile": "/api/taste-profile/",
        "taste_graph_summary": "/api/taste-graph/summary/",
        "taste_graph_rebuild": "/api/taste-graph/rebuild/",
        "taste_evolution": "/api/taste-evolution/",
        "taste_evolution_generate": "/api/taste-evolution/generate/",
        "candidates": "/api/candidates/",
        "canon_seasons": "/api/seasons/",
        "critic_personas": "/api/critic-personas/",
        "council_sessions": "/api/council-sessions/",
        "queue_items": "/api/queue-items/",
        "queue_recalculate": "/api/queue-items/recalculate/",
        "search": "/api/search/",
        "tonight_mode": "/api/queue/tonight/",
        "schema": "/api/schema/",
        "swagger_docs": "/api/docs/swagger/",
        "scalar_docs": "/api/docs/scalar/",
        "schema_v1": "/api/v1/schema/",
    },
    "mvp_modules": [
        {"name": "health", "status": "available", "path": "/api/health/"},
        {"name": "auth", "status": "available", "path": "/api/auth/me/"},
        {"name": "settings", "status": "available", "path": "/api/auth/settings/"},
        {"name": "aftertaste", "status": "available", "path": "/api/aftertaste/"},
        {
            "name": "adaptation_intelligence",
            "status": "available",
            "path": "/api/adaptations/relations/",
        },
        {"name": "analytics", "status": "available", "path": "/api/analytics/"},
        {"name": "anti_generic", "status": "available", "path": "/api/anti-generic/rules/"},
        {"name": "dashboard", "status": "available", "path": "/api/dashboard/summary/"},
        {"name": "completion_detox", "status": "available", "path": "/api/detox/rules/"},
        {"name": "discovery", "status": "available", "path": "/api/discovery/generate/"},
        {"name": "library", "status": "available", "path": "/api/media-items/"},
        {"name": "metadata", "status": "available", "path": "/api/metadata/matches/"},
        {"name": "narrative_dna", "status": "available", "path": "/api/narrative-analyses/"},
        {"name": "imports_exports", "status": "available", "path": "/api/imports/preview/"},
        {"name": "jobs", "status": "available", "path": "/api/jobs/"},
        {"name": "taste", "status": "available", "path": "/api/taste-dimensions/"},
        {"name": "taste_profile", "status": "available", "path": "/api/taste-profile/"},
        {"name": "taste_graph", "status": "available", "path": "/api/taste-graph/summary/"},
        {"name": "taste_evolution", "status": "available", "path": "/api/taste-evolution/"},
        {"name": "candidates", "status": "available", "path": "/api/candidates/"},
        {"name": "personal_canon", "status": "available", "path": "/api/seasons/"},
        {"name": "critic_council", "status": "available", "path": "/api/council-sessions/"},
        {"name": "queue", "status": "available", "path": "/api/queue-items/"},
        {"name": "search", "status": "available", "path": "/api/search/"},
        {"name": "tonight_mode", "status": "available", "path": "/api/queue/tonight/"},
    ],
}


class ApiRootView(APIView):
    authentication_classes: list[type] = []
    permission_classes = [AllowAny]

    @extend_schema(
        auth=[],
        description="List stable CanonOS MVP API entry points and documentation URLs.",
        examples=[
            OpenApiExample(
                "API root",
                value=API_ROOT_PAYLOAD,
                response_only=True,
            ),
        ],
        operation_id="api_root_retrieve",
        responses={200: dict},
        summary="CanonOS API root",
    )
    def get(self, request):  # noqa: ANN001, ANN201
        return Response(API_ROOT_PAYLOAD)
