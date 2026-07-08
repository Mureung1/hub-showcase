#!/usr/bin/env python3
"""Validate static HTML docs and their local markdown targets."""

from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote
import re
import sys


class Parser(HTMLParser):
    pass


def main() -> int:
    root = Path.cwd()
    html_files = [
        root / "docs" / "wiki" / "knowledge-graph.html",
        root / "docs" / "wiki" / "doc-viewer.html",
    ]
    for html_file in html_files:
        if not html_file.exists():
            print(f"Missing HTML doc: {html_file.relative_to(root)}", file=sys.stderr)
            return 1
        Parser().feed(html_file.read_text(encoding="utf-8"))

    knowledge_graph = (root / "docs" / "wiki" / "knowledge-graph.html").read_text(encoding="utf-8")
    missing: list[str] = []
    for raw_doc in sorted(set(re.findall(r"doc=([^\"']+\.md)", knowledge_graph))):
        rel = unquote(raw_doc)
        target = (root / "docs" / "wiki" / rel).resolve()
        if not target.exists():
            missing.append(rel)
    if missing:
        print("Knowledge graph references missing markdown documents:", file=sys.stderr)
        for item in missing:
            print(f"  - {item}", file=sys.stderr)
        return 1

    print("Docs HTML check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
