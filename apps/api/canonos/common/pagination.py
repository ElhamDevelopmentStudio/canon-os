from __future__ import annotations

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class CanonOSPageNumberPagination(PageNumberPagination):
    """Bounded page-number pagination shared by API-backed list views."""

    page_size = 25
    page_size_query_param = "pageSize"
    max_page_size = 100


def paginated_response(request, queryset, serializer_class, *, context=None):  # noqa: ANN001, ANN201
    paginator = CanonOSPageNumberPagination()
    page = paginator.paginate_queryset(queryset, request)
    serializer = serializer_class(page, many=True, context=context or {"request": request})
    return paginator.get_paginated_response(serializer.data)


def manual_paginated_response(request, results: list[object]) -> Response:  # noqa: ANN001
    """Paginate already-materialized small lists while preserving the standard shape."""

    paginator = CanonOSPageNumberPagination()
    page = paginator.paginate_queryset(results, request)
    return paginator.get_paginated_response(page)
