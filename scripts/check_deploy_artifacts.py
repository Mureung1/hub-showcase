#!/usr/bin/env python3
"""Validate that product and documentation deployment artifacts stay separate."""

from __future__ import annotations

import argparse
import os
from pathlib import Path
import sys


REPOSITORY_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_PRODUCT_ARTIFACT = REPOSITORY_ROOT / "product" / "apps" / "web" / "dist"
DEFAULT_DOCS_ARTIFACT = REPOSITORY_ROOT / "dist" / "docs-site"

COMMON_DENIED_NAMES = {
    ".git",
    ".github",
    ".harness",
    "credentials.json",
    "id_rsa",
    "id_ed25519",
    "node_modules",
    "secrets.json",
    "__pycache__",
}
SECRET_SUFFIXES = {".key", ".pem", ".p12", ".pfx", ".pyc"}
PRODUCT_DENIED_PARTS = {"docs", "src", "test", "tests"}
PRODUCT_SOURCE_SUFFIXES = {
    ".lock",
    ".map",
    ".markdown",
    ".md",
    ".py",
    ".toml",
    ".ts",
    ".tsx",
    ".yaml",
    ".yml",
}
DOCS_ALLOWED_ROOT_ENTRIES = {"docs", "index.html"}
DOCS_DENIED_PARTS = {"apps", "product", "src", "tests"}
DOCS_SOURCE_SUFFIXES = {".py", ".pyc", ".ts", ".tsx"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Check product/docs deployment artifact isolation."
    )
    parser.add_argument(
        "--product-artifact",
        type=Path,
        default=DEFAULT_PRODUCT_ARTIFACT,
        help=f"Product build directory (default: {DEFAULT_PRODUCT_ARTIFACT})",
    )
    parser.add_argument(
        "--docs-artifact",
        type=Path,
        default=DEFAULT_DOCS_ARTIFACT,
        help=f"Documentation build directory (default: {DEFAULT_DOCS_ARTIFACT})",
    )
    return parser.parse_args()


def normalized_parts(path: Path) -> tuple[str, ...]:
    return tuple(part.casefold() for part in path.parts)


def is_secret_name(name: str) -> bool:
    lowered = name.casefold()
    return (
        lowered == ".env"
        or lowered.startswith(".env.")
        or lowered in COMMON_DENIED_NAMES
        or Path(lowered).suffix in SECRET_SUFFIXES
    )


def inspect_tree(root: Path) -> tuple[list[Path], list[str]]:
    files: list[Path] = []
    errors: list[str] = []

    for current, directory_names, file_names in os.walk(root, followlinks=False):
        current_path = Path(current)

        for name in directory_names:
            path = current_path / name
            if path.is_symlink():
                errors.append(f"symbolic link is not allowed: {path.relative_to(root)}")

        for name in file_names:
            path = current_path / name
            if path.is_symlink():
                errors.append(f"symbolic link is not allowed: {path.relative_to(root)}")
            else:
                files.append(path.relative_to(root))

    return files, errors


def validate_artifact_roots(product_root: Path, docs_root: Path) -> list[str]:
    errors: list[str] = []

    for label, root in (("product", product_root), ("docs", docs_root)):
        if not root.exists():
            errors.append(f"{label} artifact does not exist: {root}")
        elif not root.is_dir():
            errors.append(f"{label} artifact is not a directory: {root}")

    product_resolved = product_root.resolve()
    docs_resolved = docs_root.resolve()
    if product_resolved == docs_resolved:
        errors.append("product and docs artifacts resolve to the same directory")
    elif product_resolved in docs_resolved.parents or docs_resolved in product_resolved.parents:
        errors.append("product and docs artifacts must not be nested inside each other")

    return errors


def validate_product(root: Path) -> list[str]:
    errors: list[str] = []
    if not root.is_dir():
        return errors

    if not (root / "index.html").is_file():
        errors.append("product artifact is missing index.html")

    files, tree_errors = inspect_tree(root)
    errors.extend(f"product: {error}" for error in tree_errors)

    for relative_path in files:
        parts = normalized_parts(relative_path)
        name = relative_path.name.casefold()
        suffix = relative_path.suffix.casefold()

        if is_secret_name(name):
            errors.append(f"product contains a secret-like file: {relative_path}")
        if PRODUCT_DENIED_PARTS.intersection(parts):
            errors.append(f"product contains an internal docs/source path: {relative_path}")
        if suffix in PRODUCT_SOURCE_SUFFIXES:
            errors.append(f"product contains a docs/source file: {relative_path}")

    return errors


def validate_docs(root: Path) -> list[str]:
    errors: list[str] = []
    if not root.is_dir():
        return errors

    if not (root / "index.html").is_file():
        errors.append("docs artifact is missing root index.html")
    if not (root / "docs").is_dir():
        errors.append("docs artifact is missing the docs/ tree")
    if not (root / "docs" / "wiki" / "doc-viewer.html").is_file():
        errors.append("docs artifact is missing docs/wiki/doc-viewer.html")
    if not (root / "docs" / "wiki" / "Home.md").is_file():
        errors.append("docs artifact is missing docs/wiki/Home.md")

    root_entries = {entry.name.casefold() for entry in root.iterdir()}
    unexpected_entries = sorted(root_entries - DOCS_ALLOWED_ROOT_ENTRIES)
    for entry in unexpected_entries:
        errors.append(f"docs artifact contains an unexpected root entry: {entry}")

    files, tree_errors = inspect_tree(root)
    errors.extend(f"docs: {error}" for error in tree_errors)

    for relative_path in files:
        parts = normalized_parts(relative_path)
        name = relative_path.name.casefold()
        suffix = relative_path.suffix.casefold()

        if is_secret_name(name):
            errors.append(f"docs contains a secret-like file: {relative_path}")
        if DOCS_DENIED_PARTS.intersection(parts):
            errors.append(f"docs contains a product source path: {relative_path}")
        if suffix in DOCS_SOURCE_SUFFIXES:
            errors.append(f"docs contains a product source file: {relative_path}")

    return errors


def main() -> int:
    args = parse_args()
    product_root = args.product_artifact.expanduser().resolve()
    docs_root = args.docs_artifact.expanduser().resolve()

    errors = validate_artifact_roots(product_root, docs_root)
    errors.extend(validate_product(product_root))
    errors.extend(validate_docs(docs_root))

    if errors:
        print("Deployment artifact boundary check failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print(f"Product artifact boundary OK: {product_root}")
    print(f"Documentation artifact boundary OK: {docs_root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
