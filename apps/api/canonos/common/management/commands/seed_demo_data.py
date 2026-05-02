from __future__ import annotations

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from canonos.accounts.models import UserProfile, UserSettings
from canonos.media.models import MediaItem
from canonos.taste.services import seed_default_taste_dimensions


class Command(BaseCommand):
    help = "Seed a small local CanonOS demo account and media library."

    def add_arguments(self, parser):  # noqa: ANN001, ANN201
        parser.add_argument("--email", default="demo@canonos.local")
        parser.add_argument("--password", default="CanonOS-demo-123")

    def handle(self, *args, **options):  # noqa: ANN002, ANN003, ANN201
        email = options["email"]
        user_model = get_user_model()
        user, created = user_model.objects.get_or_create(
            username=email,
            defaults={"email": email},
        )
        if created:
            user.set_password(options["password"])
            user.save(update_fields=["password"])

        UserProfile.objects.get_or_create(user=user, defaults={"display_name": "CanonOS Demo"})
        UserSettings.objects.get_or_create(user=user)
        seed_default_taste_dimensions(user)
        MediaItem.objects.get_or_create(
            owner=user,
            title="Stalker",
            defaults={
                "media_type": MediaItem.MediaType.MOVIE,
                "status": MediaItem.ConsumptionStatus.COMPLETED,
                "creator": "Andrei Tarkovsky",
                "release_year": 1979,
                "personal_rating": 9.5,
                "notes": "Seeded demo work for local smoke testing.",
            },
        )
        self.stdout.write(self.style.SUCCESS(f"Seeded demo account {email}."))
