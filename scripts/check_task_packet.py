from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


REQUIRED_HEADINGS = [
    "## 1. Summary",
    "## 2. Goal",
    "## 3. Scope",
    "## 4. Related Documents",
    "## 6. Acceptance Criteria",
    "## 7. Verification Plan",
    "## 9. Commit Plan",
    "## 10. Self-check",
]


def find_task_packets(root: Path) -> list[Path]:
    task_dir = root / ".harness" / "tasks"
    if not task_dir.exists():
        return []
    return sorted(
        path
        for path in task_dir.glob("*.md")
        if path.name != ".gitkeep" and not path.name.startswith("_")
    )


def has_unchecked_item(text: str) -> bool:
    return bool(re.search(r"^- \[ \] .+", text, re.MULTILINE))


def validate_packet(path: Path, root: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    errors: list[str] = []

    for heading in REQUIRED_HEADINGS:
        if heading not in text:
            errors.append(f"{path}: missing heading: {heading}")

    if not has_unchecked_item(text):
        errors.append(f"{path}: no unchecked acceptance/self-check items found")

    related_section = text.split("## 4. Related Documents", 1)
    if len(related_section) == 2:
        next_section = related_section[1].split("## 5.", 1)[0]
        doc_refs = re.findall(r"(docs/[^\s`]+\.md)", next_section)
        for ref in doc_refs:
            if not (root / ref).exists():
                errors.append(f"{path}: related document does not exist: {ref}")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate LocalTwin task packets.")
    parser.add_argument(
        "--root",
        default=".",
        help="Repository root. Defaults to current directory.",
    )
    parser.add_argument(
        "--require",
        action="store_true",
        help="Fail when no task packet exists.",
    )
    args = parser.parse_args()

    root = Path(args.root).resolve()
    packets = find_task_packets(root)

    if args.require and not packets:
        print("No task packet found in .harness/tasks.", file=sys.stderr)
        print("Create one from .harness/templates/task-packet.md before implementation.", file=sys.stderr)
        return 1

    errors: list[str] = []
    for packet in packets:
        errors.extend(validate_packet(packet, root))

    if errors:
        print("Task packet check failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print(f"Task packet check passed: {len(packets)} packet(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
