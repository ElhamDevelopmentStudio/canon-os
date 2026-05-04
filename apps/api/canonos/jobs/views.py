from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from canonos.common.pagination import paginated_response

from .models import BackgroundJob
from .serializers import BackgroundJobSerializer


class BackgroundJobListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: BackgroundJobSerializer(many=True)},
        summary="List background jobs",
    )
    def get(self, request):  # noqa: ANN001, ANN201
        jobs = BackgroundJob.objects.filter(owner=request.user).order_by("-created_at")
        return paginated_response(request, jobs, BackgroundJobSerializer)


class BackgroundJobDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: BackgroundJobSerializer}, summary="Get background job status")
    def get(self, request, job_id):  # noqa: ANN001, ANN201
        job = BackgroundJob.objects.filter(owner=request.user, id=job_id).first()
        if job is None:
            return Response(
                {"detail": "Background job not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(BackgroundJobSerializer(job).data)
