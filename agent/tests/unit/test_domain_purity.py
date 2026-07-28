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


PURE_METRIC_MODULES = (
    "expansion.py",
    "families.py",
    "policy.py",
    "temporal.py",
    "verification.py",
)
"""저장소를 import 하지 않는다고 스스로 적은 지표 모듈.

`metrics/` 는 전체가 순수하지 않다. `runner`·`depth_profile`·`saturation` 은 저장소를
받아 실행 순서를 정한다. 나머지 다섯은 값만 받아 판정하므로 저장소 없이 검사할 수
있고, 그 성질이 깨지면 SQL 없이 규칙만 검사하던 테스트가 데이터베이스를 요구한다.
"""

FORBIDDEN_IN_PURE_METRICS = {
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
    "careersignal.orchestration",
}


def test_pure_metric_modules_have_no_repository_imports() -> None:
    bad: list[str] = []
    for name in PURE_METRIC_MODULES:
        path = SRC / "metrics" / name
        for imported in _imports(path):
            root = imported.split(".")[0]
            if imported in FORBIDDEN_IN_PURE_METRICS or root in FORBIDDEN_IN_PURE_METRICS:
                bad.append(f"{path.relative_to(SRC)} -> {imported}")
    assert bad == []


def test_running_metric_modules_receive_their_repository() -> None:
    """실행 모듈은 저장소를 형으로만 알고 만들지 않는다.

    `metrics/runner.py` 는 형 검사에서만 저장소를 import 한다.
    `repositories/metrics.py` 가 집계 문장을 세우려고 `metrics/families.py` 를
    import 하므로, 실행 시점에 서로를 import 하면 두 모듈이 서로를 기다린다.
    """
    text = (SRC / "metrics" / "runner.py").read_text(encoding="utf-8")
    assert "if TYPE_CHECKING:" in text
    assert "from careersignal.repositories.metrics import MetricRepository" in text
