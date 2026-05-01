#!/usr/bin/env python3
"""Create/update the local backend virtual environment for repeatable scripts."""

from __future__ import annotations

import hashlib
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VENV = ROOT / ".venv"
REQUIREMENTS = ROOT / "requirements-dev.txt"
MARKER = VENV / ".canonos-requirements.sha256"


def run(command: list[str]) -> None:
    subprocess.run(command, cwd=ROOT, check=True)


def digest_requirements() -> str:
    digest = hashlib.sha256()
    for requirement_file in [ROOT / "requirements.txt", REQUIREMENTS]:
        digest.update(requirement_file.read_bytes())
    return digest.hexdigest()


def main() -> None:
    if not VENV.exists():
        run([sys.executable, "-m", "venv", str(VENV)])

    python = VENV / "bin" / "python"
    expected_digest = digest_requirements()
    current_digest = MARKER.read_text().strip() if MARKER.exists() else ""

    if current_digest != expected_digest:
        run([str(python), "-m", "pip", "install", "--upgrade", "pip", "setuptools", "wheel"])
        run([str(python), "-m", "pip", "install", "-r", str(REQUIREMENTS)])
        MARKER.write_text(expected_digest)


if __name__ == "__main__":
    os.environ.setdefault("PIP_DISABLE_PIP_VERSION_CHECK", "1")
    main()
