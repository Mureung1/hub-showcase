#!/usr/bin/env python3
"""Validate static docs HTML and local documentation links."""

from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse
import re
import sys


class LinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.hrefs: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        for name, value in attrs:
            if name.lower() == "href" and value:
                self.hrefs.append(value)


def is_external(href: str) -> bool:
    return href.startswith(("#", "http://", "https://", "mailto:", "tel:", "javascript:"))


def markdown_links(text: str) -> list[str]:
    return re.findall(r"\[[^\]]+\]\(([^)]+)\)", text)


def resolve_doc_viewer_target(root: Path, href: str) -> tuple[Path | None, str | None]:
    parsed = urlparse(href)
    query = parse_qs(parsed.query)
    doc_values = query.get("doc")
    if not doc_values:
        return None, "doc-viewer link is missing doc query"
    doc = unquote(doc_values[0])
    if "?" in doc or "#" in doc or ".html" in doc:
        return None, f"nested or invalid doc-viewer target: {doc}"
    if not doc.endswith(".md"):
        return None, f"doc-viewer target is not markdown: {doc}"
    target = (root / "docs" / "wiki" / doc).resolve()
    docs_root = (root / "docs").resolve()
    if docs_root not in [target, *target.parents]:
        return None, f"doc-viewer target escapes docs/: {doc}"
    return target, None


def check_local_href(root: Path, source: Path, href: str) -> list[str]:
    if is_external(href):
        return []
    errors: list[str] = []
    if "doc-viewer.html?doc=" in href:
        target, error = resolve_doc_viewer_target(root, href)
        if error:
            errors.append(f"{source.relative_to(root)}: {error}")
        elif target and not target.exists():
            errors.append(f"{source.relative_to(root)}: missing doc-viewer target {target.relative_to(root)}")
        return errors

    parsed = urlparse(href)
    local_path = parsed.path
    if not local_path.endswith((".md", ".html")):
        return []
    target = (source.parent / local_path).resolve()
    project_root = root.resolve()
    if project_root not in [target, *target.parents]:
        errors.append(f"{source.relative_to(root)}: link escapes project root: {href}")
    elif not target.exists():
        errors.append(f"{source.relative_to(root)}: missing local link target: {href}")
    return errors


def main() -> int:
    root = Path.cwd()
    required_html = [
        root / "docs" / "wiki" / "knowledge-graph.html",
        root / "docs" / "wiki" / "doc-viewer.html",
        root / "docs" / "prototypes" / "core-market-analysis-prototype.html",
    ]
    errors: list[str] = []

    for html_file in required_html:
        if not html_file.exists():
            errors.append(f"Missing HTML doc: {html_file.relative_to(root)}")

    for markdown_file in sorted([root / "README.md", *root.glob("docs/**/*.md")]):
        text = markdown_file.read_text(encoding="utf-8")
        if "<sub>[Wiki Home]" in text:
            errors.append(f"{markdown_file.relative_to(root)}: remove raw <sub> wiki navigation")
        for href in markdown_links(text):
            errors.extend(check_local_href(root, markdown_file, href))

    for html_file in sorted(root.glob("docs/**/*.html")):
        text = html_file.read_text(encoding="utf-8")
        parser = LinkParser()
        parser.feed(text)
        for href in parser.hrefs:
            errors.extend(check_local_href(root, html_file, href))
        for raw_doc in sorted(set(re.findall(r"doc=([^\"'`<>\s]+\.md)", text))):
            target, error = resolve_doc_viewer_target(root, f"./doc-viewer.html?doc={raw_doc}")
            if error:
                errors.append(f"{html_file.relative_to(root)}: {error}")
            elif target and not target.exists():
                errors.append(f"{html_file.relative_to(root)}: missing graph/viewer target {target.relative_to(root)}")

    viewer = root / "docs" / "wiki" / "doc-viewer.html"
    if viewer.exists():
        viewer_text = viewer.read_text(encoding="utf-8")
        tree_paths = set(re.findall(r'data-doc-path="([^"]+)"', viewer_text))
        expected_paths = {
            path.relative_to(root / "docs").as_posix()
            for path in root.glob("docs/**/*")
            if path.is_file() and path.suffix in {".md", ".html"}
        }
        missing_from_tree = sorted(expected_paths - tree_paths)
        stale_tree_paths = sorted(tree_paths - expected_paths)
        for path in missing_from_tree:
            errors.append(f"docs/wiki/doc-viewer.html: document tree is missing docs/{path}")
        for path in stale_tree_paths:
            errors.append(f"docs/wiki/doc-viewer.html: document tree target does not exist: docs/{path}")

    if errors:
        for error in errors:
            print(error, file=sys.stderr)
        return 1

    print("Docs HTML and local link check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
