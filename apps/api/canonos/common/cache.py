from __future__ import annotations

from collections.abc import Callable
from typing import TypeVar

from django.contrib.auth.models import AnonymousUser, User
from django.core.cache import cache

Payload = TypeVar("Payload")
USER_DATA_CACHE_TIMEOUT_SECONDS = 60


def _user_id(user: User | AnonymousUser) -> int | None:
    return user.id if getattr(user, "is_authenticated", False) else None


def _version_key(user: User | AnonymousUser) -> str:
    return f"canonos:user:{_user_id(user)}:data-version"


def get_user_data_cache_version(user: User | AnonymousUser) -> int:
    version_key = _version_key(user)
    version = cache.get(version_key)
    if isinstance(version, int):
        return version
    cache.set(version_key, 1, timeout=None)
    return 1


def user_data_cache_key(user: User | AnonymousUser, namespace: str) -> str:
    return f"canonos:user:{_user_id(user)}:v{get_user_data_cache_version(user)}:{namespace}"


def cache_user_payload(
    user: User | AnonymousUser,
    namespace: str,
    builder: Callable[[], Payload],
    *,
    timeout: int = USER_DATA_CACHE_TIMEOUT_SECONDS,
) -> Payload:
    cache_key = user_data_cache_key(user, namespace)
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
    payload = builder()
    cache.set(cache_key, payload, timeout=timeout)
    return payload


def invalidate_user_data_cache(user: User | AnonymousUser) -> None:
    if not getattr(user, "is_authenticated", False):
        return
    version_key = _version_key(user)
    try:
        cache.incr(version_key)
    except ValueError:
        cache.set(version_key, get_user_data_cache_version(user) + 1, timeout=None)
