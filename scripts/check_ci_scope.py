#!/usr/bin/env python3
"""Verify that CI remains scoped to the personal fork."""

from __future__ import annotations

import re
import sys
from pathlib import Path


WORKFLOW = Path(".github/workflows/ci.yml")
EXPECTED_REPOSITORY_GUARD = "if: github.repository == 'HyunKN/hub'"
EXPECTED_JOBS = ("docs", "web", "api")


def job_block(text: str, job: str) -> str | None:
    match = re.search(
        rf"(?ms)^  {re.escape(job)}:\n(?P<body>.*?)(?=^  [a-zA-Z0-9_-]+:\n|\Z)",
        text,
    )
    return match.group("body") if match else None


def main() -> int:
    text = WORKFLOW.read_text(encoding="utf-8")
    errors: list[str] = []

    for event in ("pull_request", "push"):
        pattern = rf"(?ms)^  {event}:\n    branches:\n      - develop\n      - main$"
        if not re.search(pattern, text):
            errors.append(f"{event} must target only develop and main")

    if not re.search(r"(?m)^  workflow_dispatch:\s*$", text):
        errors.append("workflow_dispatch must remain available")

    for job in EXPECTED_JOBS:
        block = job_block(text, job)
        if block is None:
            errors.append(f"missing CI job: {job}")
        elif EXPECTED_REPOSITORY_GUARD not in block:
            errors.append(f"{job} job is missing the HyunKN/hub repository guard")

    if errors:
        print("CI scope check failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print("CI scope check passed: HyunKN/hub main/develop only.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
