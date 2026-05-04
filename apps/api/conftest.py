from __future__ import annotations

import pytest
from django.core.cache import cache


@pytest.fixture(autouse=True)
def clear_django_cache_between_tests():  # noqa: ANN201
    cache.clear()
    yield
    cache.clear()
