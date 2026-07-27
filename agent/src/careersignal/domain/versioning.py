"""버전 식별자.

접두사 규약은 docs/erd.md 2.2를 따른다.
저장소와 생성 모델을 import 하지 않는다.
"""

from __future__ import annotations

import re
from enum import StrEnum

PREFIXES: dict[str, str] = {
    "source": "src_",
    "source_snapshot": "snap_",
    "source_chunk": "chunk_",
    "requirement_mention": "mention_",
    "assignment": "assign_",
    "requirement_dimension": "dim_",
    "capability": "cap_",
    "knowledge_node": "node_",
    "knowledge_edge": "edge_",
    "statistic_fact": "fact_",
    "analysis_claim": "claim_",
    "analysis_output": "out_",
    "agent_run": "run_",
    "analysis_version": "an_",
    "dataset_version": "ds_",
    "taxonomy_version": "tx_",
    "knowledge_version": "kn_",
}

_ID_PATTERN = re.compile(r"^[a-z_]+_[A-Za-z0-9]+$")


class AnalysisVersionStatus(StrEnum):
    """docs/architecture.md 8장의 분석 버전 생명주기."""

    DRAFT = "draft"
    RUNNING = "running"
    VALIDATING = "validating"
    GATED = "gated"
    ACTIVE = "active"
    FAILED = "failed"
    SUPERSEDED = "superseded"


_ALLOWED_TRANSITIONS: dict[AnalysisVersionStatus, frozenset[AnalysisVersionStatus]] = {
    AnalysisVersionStatus.DRAFT: frozenset({AnalysisVersionStatus.RUNNING}),
    AnalysisVersionStatus.RUNNING: frozenset(
        {AnalysisVersionStatus.VALIDATING, AnalysisVersionStatus.FAILED}
    ),
    AnalysisVersionStatus.VALIDATING: frozenset(
        {AnalysisVersionStatus.GATED, AnalysisVersionStatus.FAILED}
    ),
    AnalysisVersionStatus.GATED: frozenset(
        {AnalysisVersionStatus.ACTIVE, AnalysisVersionStatus.FAILED}
    ),
    AnalysisVersionStatus.ACTIVE: frozenset({AnalysisVersionStatus.SUPERSEDED}),
    AnalysisVersionStatus.FAILED: frozenset({AnalysisVersionStatus.RUNNING}),
    AnalysisVersionStatus.SUPERSEDED: frozenset(),
}


def can_transition(
    current: AnalysisVersionStatus, target: AnalysisVersionStatus
) -> bool:
    return target in _ALLOWED_TRANSITIONS[current]


def require_transition(
    current: AnalysisVersionStatus, target: AnalysisVersionStatus
) -> None:
    if not can_transition(current, target):
        raise ValueError(f"{current} 에서 {target} 으로 전이할 수 없다")


def has_prefix(identifier: str, entity: str) -> bool:
    prefix = PREFIXES.get(entity)
    if prefix is None:
        raise KeyError(f"등록되지 않은 엔티티: {entity}")
    return identifier.startswith(prefix)


def require_prefix(identifier: str, entity: str) -> str:
    if not identifier or not _ID_PATTERN.match(identifier):
        raise ValueError(f"식별자 형식이 아니다: {identifier!r}")
    if not has_prefix(identifier, entity):
        raise ValueError(
            f"{entity} 식별자는 {PREFIXES[entity]!r} 로 시작해야 한다: {identifier!r}"
        )
    return identifier
