from __future__ import annotations

from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Validate that all database migrations can be inspected before deployment."

    def handle(self, *args, **options):  # noqa: ANN002, ANN003, ANN201
        call_command("showmigrations", "--plan", verbosity=0)
        self.stdout.write(self.style.SUCCESS("Migration graph is readable."))
