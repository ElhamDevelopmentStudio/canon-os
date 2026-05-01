from __future__ import annotations

from django.contrib.auth.models import User

from .defaults import DEFAULT_TASTE_DIMENSIONS
from .models import TasteDimension


def seed_default_taste_dimensions(user: User) -> list[TasteDimension]:
    dimensions: list[TasteDimension] = []
    for definition in DEFAULT_TASTE_DIMENSIONS:
        dimension, _ = TasteDimension.objects.update_or_create(
            owner=user,
            slug=definition["slug"],
            defaults={
                "name": definition["name"],
                "description": definition["description"],
                "direction": definition["direction"],
                "is_default": True,
            },
        )
        dimensions.append(dimension)
    return dimensions
