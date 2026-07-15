from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import tempfile
from pathlib import Path


QUESTION_MARK_RUN = re.compile(r"\?{3,}")


def normalize_body(text: str) -> str:
    return text.replace("\r\n", "\n").replace("\r", "\n").rstrip("\n")


def validate_body(text: str) -> None:
    if "\x00" in text:
        raise ValueError("Issue body contains a NUL character.")
    if "\ufffd" in text:
        raise ValueError("Issue body contains a Unicode replacement character.")
    if QUESTION_MARK_RUN.search(text):
        raise ValueError("Issue body contains 3 or more consecutive question marks.")


def find_gh(command: str) -> str:
    discovered = shutil.which(command)
    if discovered:
        return discovered

    default_windows_path = Path("C:/Program Files/GitHub CLI/gh.exe")
    if command == "gh" and default_windows_path.is_file():
        return str(default_windows_path)

    raise FileNotFoundError(f"GitHub CLI was not found: {command}")


def run_gh(gh: str, *args: str) -> str:
    completed = subprocess.run(
        [gh, *args],
        check=True,
        capture_output=True,
        encoding="utf-8",
        errors="strict",
    )
    return completed.stdout


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Update a GitHub Issue from a UTF-8 Markdown file and verify it."
    )
    parser.add_argument("--repo", required=True, help="GitHub repository, for example owner/repo")
    parser.add_argument("--issue", required=True, type=int, help="Issue number")
    parser.add_argument("--body-file", required=True, type=Path, help="UTF-8 Markdown body file")
    parser.add_argument("--gh", default="gh", help="GitHub CLI command or absolute path")
    parser.add_argument(
        "--check-only",
        action="store_true",
        help="Validate the local body without updating GitHub",
    )
    args = parser.parse_args()

    source_body = args.body_file.read_text(encoding="utf-8-sig")
    validate_body(source_body)

    if args.check_only:
        print(f"Issue body validation passed: {args.body_file}")
        return 0

    gh = find_gh(args.gh)
    normalized_source = normalize_body(source_body)

    temporary_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            newline="\n",
            suffix=".md",
            delete=False,
        ) as temporary:
            temporary.write(normalized_source)
            temporary.write("\n")
            temporary_path = Path(temporary.name)

        run_gh(
            gh,
            "issue",
            "edit",
            str(args.issue),
            "--repo",
            args.repo,
            "--body-file",
            str(temporary_path),
        )

        remote_json = run_gh(
            gh,
            "issue",
            "view",
            str(args.issue),
            "--repo",
            args.repo,
            "--json",
            "body",
        )
        remote_body = json.loads(remote_json)["body"]
        validate_body(remote_body)

        if normalize_body(remote_body) != normalized_source:
            raise RuntimeError("Remote Issue body does not match the UTF-8 source file.")
    finally:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)

    print(f"Issue #{args.issue} updated and verified: {args.repo}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
