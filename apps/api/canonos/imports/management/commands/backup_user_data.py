from __future__ import annotations

from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from canonos.imports.services import export_json_for_user


class Command(BaseCommand):
    help = "Write a full-fidelity CanonOS JSON export for one user to disk."

    def add_arguments(self, parser):  # noqa: ANN001, ANN201
        parser.add_argument("--email", required=True, help="Email address of the user to export.")
        parser.add_argument("--output", required=True, help="Output JSON file path.")

    def handle(self, *args, **options):  # noqa: ANN002, ANN003, ANN201
        user_model = get_user_model()
        user = user_model.objects.filter(email__iexact=options["email"]).first()
        if user is None:
            raise CommandError(f"No user found for {options['email']}.")
        output = Path(options["output"])
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(export_json_for_user(user), encoding="utf-8")
        self.stdout.write(self.style.SUCCESS(f"Wrote CanonOS backup to {output}"))
