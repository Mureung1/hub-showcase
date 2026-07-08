from __future__ import annotations

import sys
from pathlib import Path


PUBLIC_DOC_DIRS = [
    Path("docs/wiki"),
    Path("docs/development"),
    Path("docs/features"),
    Path("docs/data"),
    Path("docs/evaluation"),
    Path("docs/module-notes"),
]


def main() -> int:
    root = Path(".").resolve()
    readme = root / "README.md"
    wiki_home = root / "docs" / "wiki" / "Home.md"

    index_text = ""
    for index in [readme, wiki_home]:
        if index.exists():
            index_text += index.read_text(encoding="utf-8") + "\n"

    missing: list[str] = []
    for doc_dir in PUBLIC_DOC_DIRS:
        full_dir = root / doc_dir
        if not full_dir.exists():
            continue
        for doc in sorted(full_dir.glob("*.md")):
            rel = doc.relative_to(root).as_posix()
            if rel not in index_text and doc.name not in index_text:
                missing.append(rel)

    if missing:
        print("Docs index check failed. Missing README or Wiki Home links:", file=sys.stderr)
        for rel in missing:
            print(f"- {rel}", file=sys.stderr)
        return 1

    print("Docs index check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
