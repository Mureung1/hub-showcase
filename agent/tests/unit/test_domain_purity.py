"""domain 과 contracts 의 의존 경계를 강제한다.

docs/architecture.md 2.2와 AGENTS.md 의 모듈 경계를 코드로 검사한다.
"""

from __future__ import annotations

import ast
from pathlib import Path

SRC = Path(__file__).resolve().parents[2] / "src" / "careersignal"

FORBIDDEN_IN_DOMAIN = {
    "psycopg",
    "sqlalchemy",
    "alembic",
    "openai",
    "httpx",
    "requests",
    "supabase",
    "fastapi",
    "careersignal.repositories",
    "careersignal.providers",
    "careersignal.agents",
    "careersignal.pipelines",
    "careersignal.orchestration",
    "careersignal.retrieval",
}

FORBIDDEN_IN_CONTRACTS = FORBIDDEN_IN_DOMAIN - {"careersignal.providers"}


def _imports(path: Path) -> set[str]:
    tree = ast.parse(path.read_text(encoding="utf-8"))
    found: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            found.update(a.name for a in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            found.add(node.module)
    return found


def _violations(package: str, forbidden: set[str]) -> list[str]:
    bad: list[str] = []
    for path in (SRC / package).rglob("*.py"):
        for name in _imports(path):
            root = name.split(".")[0]
            if name in forbidden or root in forbidden:
                bad.append(f"{path.relative_to(SRC)} -> {name}")
    return bad


def test_domain_has_no_infrastructure_imports() -> None:
    assert _violations("domain", FORBIDDEN_IN_DOMAIN) == []


def test_contracts_have_no_infrastructure_imports() -> None:
    assert _violations("contracts", FORBIDDEN_IN_CONTRACTS) == []


def test_domain_does_not_import_contracts() -> None:
    bad = [
        f"{p.relative_to(SRC)} -> {n}"
        for p in (SRC / "domain").rglob("*.py")
        for n in _imports(p)
        if n.startswith("careersignal.contracts")
    ]
    assert bad == []
