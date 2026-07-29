"""검색 후보와 사용 목적 기록.

Phase 7-4 다. 표는 docs/erd.md 12장의 `retrieval_runs`·`retrieval_queries`·
`retrieval_candidates`·`evidence_sets`·`evidence_set_members`·`evidence_usages`
여섯이며 이 순서가 외래키의 순서다. 앞의 행이 없으면 뒤의 행을 넣지 못한다.

`retrieval_runs` 는 분석 버전과 실행 식별자를 요구하므로 오케스트레이터의 실행
봉투를 받는다(`orchestration/envelope.py`). 봉투를 만들지 않는다. 봉투를 만드는 것은
분석 버전 행을 만드는 일이고 그 쓰기 범위는 오케스트레이터에 있다
(docs/permission-matrix.md 3장).

후보를 담는 것과 사용 목적을 담는 것은 다른 일이다. 검색 결과는 최종 인용 외에도
반례 검사, 용어 정규화, 다음 검색 계획, 부재 확인에 기여하며(docs/architecture.md
14.2) 그 기여는 후보를 만든 시점이 아니라 에이전트가 그 후보로 무엇을 했는지가
정해진 뒤에야 안다. 그래서 `record_usages` 를 따로 둔다. 사용 목적을 기록하지 않으면
`citation_utilization` 의 분자가 언제나 0 이다.

저장소는 `Protocol` 로 주입한다. `psycopg` 를 import 하지 않는다. 식별자 계산과 순서
검사는 저장소 없이 검증할 수 있다.
"""

from __future__ import annotations

import hashlib
from collections.abc import Sequence
from datetime import datetime
from typing import Any, Protocol

from careersignal.contracts.evidence import (
    EvidenceCandidate,
    EvidenceSet,
    EvidenceUsage,
    UsageType,
)
from careersignal.orchestration.envelope import Envelope

RUN_PREFIX = "rrun_"
QUERY_PREFIX = "rq_"
USAGE_PREFIX = "use_"
"""계측 표의 식별자 접두사. docs/erd.md 2.2에 자리가 없어 표 이름을 따른다."""

DIGEST_LENGTH = 24
MATERIAL_SEPARATOR = ":"

QUERY_STRATEGIES: frozenset[str] = frozenset({"keyword", "vector", "graph", "sql"})
"""`retrieval_queries.strategy` 의 CHECK 와 같은 값 집합(docs/erd.md 12장).

융합은 질의의 전략이 아니다. 융합은 두 질의의 결과를 합치는 단계이며 그 결과는
`retrieval_candidates.strategy` 에 남는다.
"""

RUN_NOT_STARTED = "검색 실행 행을 먼저 만들어야 한다"
"""`retrieval_queries` 가 `retrieval_run_id` 를 요구한다."""

UNKNOWN_STRATEGY = "retrieval_queries.strategy 가 아닌 값이다"

UNRECORDED_CANDIDATE = "기록되지 않은 후보를 가리킨다"
"""`evidence_set_members` 와 `evidence_usages` 가 `candidate_id` 를 참조한다.

후보를 담기 전에 묶음이나 사용 기록을 넣으면 외래키가 거부한다. 데이터베이스에
닿기 전에 같은 이유로 멈춰 어느 단계가 빠졌는지 사유로 남긴다.
"""

DUPLICATE_RUN = "검색 실행을 두 번 시작했다"
"""계측은 append-only 다. 같은 기본키를 두 번 넣지 못한다."""


class RetrievalTelemetryStore(Protocol):
    """검색 계측이 저장소에 요구하는 것 여섯.

    표 하나에 메서드 하나다. 좁게 잡아 대역으로 검증할 수 있게 한다.
    `add_evidence_set` 과 `add_members` 는 `repositories/graph_paths.py` 의
    `EvidenceSetRepository` 가 같은 이름으로 이미 갖고 있다.
    """

    def add_retrieval_run(
        self,
        retrieval_run_id: str,
        analysis_version: str,
        agent_name: str,
        agent_run_id: str,
        started_at: datetime,
    ) -> None: ...

    def add_query(
        self,
        query_id: str,
        retrieval_run_id: str,
        subquery_type: str,
        query_text: str,
        strategy: str,
        filters: dict[str, Any],
    ) -> None: ...

    def add_candidates(self, query_id: str, rows: list[dict[str, Any]]) -> None: ...

    def add_evidence_set(
        self,
        evidence_set_id: str,
        retrieval_run_id: str,
        objective_id: str,
        optimization_policy_version: str,
    ) -> None: ...

    def add_members(
        self, evidence_set_id: str, members: list[tuple[str, str]]
    ) -> None: ...

    def add_usages(self, rows: list[dict[str, Any]]) -> None: ...


def _digest(material: str) -> str:
    return hashlib.sha256(material.encode()).hexdigest()[:DIGEST_LENGTH]


def retrieval_run_identifier(
    analysis_version: str, agent_run_id: str, sequence: int = 1
) -> str:
    """같은 봉투의 같은 회차 검색은 같은 실행이다.

    한 에이전트 실행이 검색을 여러 번 돌 수 있으므로 `sequence` 로 가른다. 시각을
    재료에 넣지 않는다. 넣으면 같은 실행을 다시 돌릴 때마다 계측이 늘어난다.
    """
    material = MATERIAL_SEPARATOR.join(
        (analysis_version, agent_run_id, str(sequence))
    )
    return RUN_PREFIX + _digest(material)


def query_identifier(
    retrieval_run_id: str, subquery_type: str, strategy: str, query_text: str
) -> str:
    """같은 실행에서 같은 전략으로 던진 같은 질문은 같은 질의다."""
    material = MATERIAL_SEPARATOR.join(
        (retrieval_run_id, subquery_type, strategy, query_text)
    )
    return QUERY_PREFIX + _digest(material)


def usage_identifier(
    candidate_id: str, usage_type: UsageType, used_claim_id: str | None
) -> str:
    """한 후보의 한 용도, 한 주장에 한 행이다.

    같은 후보가 여러 주장을 지지하면 주장마다 행이 갈린다. 주장을 재료에서 빼면 두
    번째 지지가 첫 번째와 같은 기본키를 갖는다.
    """
    material = MATERIAL_SEPARATOR.join(
        (candidate_id, str(usage_type), used_claim_id or "")
    )
    return USAGE_PREFIX + _digest(material)


def candidate_row(query_id: str, candidate: EvidenceCandidate) -> dict[str, Any]:
    """후보 하나를 `retrieval_candidates` 한 행으로 옮긴다.

    고른 후보만이 아니라 검색이 만난 후보 전부를 담는다. 담기지 않은 후보의 사유가
    없으면 `citation_utilization` 의 분모가 실제 검색량과 달라진다.
    """
    return {
        "candidate_id": candidate.candidate_id,
        "query_id": query_id,
        "target_type": candidate.target_type,
        "target_id": candidate.target_id,
        "strategy": str(candidate.strategy),
        "strategy_rank": candidate.strategy_rank,
        "lexical_score": candidate.lexical_score,
        "vector_score": candidate.vector_score,
        "graph_score": candidate.graph_score,
        "fusion_score": candidate.fusion_score,
        "rerank_score": candidate.rerank_score,
        "selected": candidate.selected,
        "rejection_reason": candidate.rejection_reason,
    }


def usage_row(usage: EvidenceUsage, recorded_at: datetime) -> dict[str, Any]:
    """사용 기록 하나를 `evidence_usages` 한 행으로 옮긴다.

    `used_claim_id` 가 필요한 용도는 `EvidenceUsage` 가 이미 막는다. 표의 CHECK 와
    같은 규칙이 계약에 있으므로 여기서 다시 검사하지 않는다.
    """
    return {
        "usage_id": usage_identifier(
            usage.candidate_id, usage.usage_type, usage.used_claim_id
        ),
        "candidate_id": usage.candidate_id,
        "used_claim_id": usage.used_claim_id,
        "usage_type": str(usage.usage_type),
        "recorded_at": recorded_at,
    }


class RetrievalRecorder:
    """검색 한 실행의 계측을 순서대로 남긴다.

    표 여섯의 순서를 이 객체가 지킨다. 실행 → 질의 → 후보 → 근거 집합 → 구성원 →
    사용 목적이며, 앞 단계를 건너뛰면 데이터베이스에 닿기 전에 멈춘다.

    갱신하지 않는다. 고른 묶음이 달라지면 새 `evidence_set_id` 로 새 집합을 만든다
    (docs/erd.md 12장, `repositories/graph_paths.py`).
    """

    def __init__(
        self,
        store: RetrievalTelemetryStore,
        envelope: Envelope,
        agent_name: str,
        sequence: int = 1,
    ) -> None:
        self._store = store
        self._envelope = envelope
        self._agent_name = agent_name
        self._sequence = sequence
        self._retrieval_run_id: str | None = None
        self._candidate_ids: set[str] = set()

    @property
    def analysis_version(self) -> str:
        return self._envelope.analysis_version

    @property
    def agent_run_id(self) -> str:
        return self._envelope.agent_run_id

    @property
    def retrieval_run_id(self) -> str:
        """시작하지 않았으면 예외다. 뒤 표가 모두 이 값을 요구한다."""
        if self._retrieval_run_id is None:
            raise ValueError(RUN_NOT_STARTED)
        return self._retrieval_run_id

    @property
    def started(self) -> bool:
        return self._retrieval_run_id is not None

    def _require_started(self) -> str:
        """실행 행이 없으면 멈춘다. 뒤 표가 모두 이 행을 가리킨다."""
        return self.retrieval_run_id

    @property
    def recorded_candidates(self) -> frozenset[str]:
        return frozenset(self._candidate_ids)

    def start(self, started_at: datetime | None = None) -> str:
        """`retrieval_runs` 한 행. 실행 식별자를 돌려준다."""
        if self._retrieval_run_id is not None:
            raise ValueError(f"{DUPLICATE_RUN}: {self._retrieval_run_id}")
        retrieval_run_id = retrieval_run_identifier(
            self.analysis_version, self.agent_run_id, self._sequence
        )
        self._store.add_retrieval_run(
            retrieval_run_id=retrieval_run_id,
            analysis_version=self.analysis_version,
            agent_name=self._agent_name,
            agent_run_id=self.agent_run_id,
            started_at=started_at or datetime.now(),
        )
        self._retrieval_run_id = retrieval_run_id
        return retrieval_run_id

    def record_query(
        self,
        query_text: str,
        strategy: str,
        subquery_type: str,
        candidates: Sequence[EvidenceCandidate] = (),
        filters: dict[str, Any] | None = None,
    ) -> str:
        """질의 한 행과 그 질의가 만난 후보 전부.

        `filters` 는 NOT NULL 이므로 거른 조건이 없으면 빈 객체를 넣는다. 비운 값과
        조건이 없는 것을 표에서 구분하지 않는다.
        """
        run_id = self.retrieval_run_id
        if strategy not in QUERY_STRATEGIES:
            raise ValueError(f"{UNKNOWN_STRATEGY}: {strategy}")

        query_id = query_identifier(run_id, subquery_type, strategy, query_text)
        self._store.add_query(
            query_id=query_id,
            retrieval_run_id=run_id,
            subquery_type=subquery_type,
            query_text=query_text,
            strategy=strategy,
            filters=dict(filters or {}),
        )
        if candidates:
            self._store.add_candidates(
                query_id, [candidate_row(query_id, c) for c in candidates]
            )
            self._candidate_ids.update(c.candidate_id for c in candidates)
        return query_id

    def record_evidence_set(
        self, evidence_set: EvidenceSet, members: Sequence[tuple[str, str]] | None = None
    ) -> str:
        """근거 집합과 구성원.

        구성원의 후보가 이 실행에서 기록되지 않았으면 담지 않는다. 외래키가 거부할
        행을 만들기 전에 멈추고 어느 후보가 빠졌는지 사유로 남긴다.

        `members` 를 넘기지 않으면 `slot_assignment` 에서 만든다. 슬롯을 배정받은
        후보만 구성원이다.
        """
        run_id = self.retrieval_run_id
        rows = list(members) if members is not None else _member_rows(evidence_set)
        missing = sorted(
            candidate_id
            for candidate_id, _ in rows
            if candidate_id not in self._candidate_ids
        )
        if missing:
            raise ValueError(f"{UNRECORDED_CANDIDATE}: {', '.join(missing)}")

        self._store.add_evidence_set(
            evidence_set_id=evidence_set.evidence_set_id,
            retrieval_run_id=run_id,
            objective_id=evidence_set.objective_id,
            optimization_policy_version=evidence_set.optimization_policy_version,
        )
        if rows:
            self._store.add_members(evidence_set.evidence_set_id, rows)
        return evidence_set.evidence_set_id

    def record_usages(
        self,
        usages: Sequence[EvidenceUsage],
        recorded_at: datetime | None = None,
    ) -> tuple[str, ...]:
        """사용 목적. 인용하지 않은 기여도 함께 남긴다.

        `unused` 도 기록한다. 쓰지 않았다는 사실이 없으면 검색이 만났으나 쓰이지
        않은 후보와 아직 판정하지 않은 후보를 구분할 수 없다.
        """
        self._require_started()
        missing = sorted(
            usage.candidate_id
            for usage in usages
            if usage.candidate_id not in self._candidate_ids
        )
        if missing:
            raise ValueError(f"{UNRECORDED_CANDIDATE}: {', '.join(missing)}")

        moment = recorded_at or datetime.now()
        rows = [usage_row(usage, moment) for usage in usages]
        if rows:
            self._store.add_usages(rows)
        return tuple(row["usage_id"] for row in rows)


def _member_rows(evidence_set: EvidenceSet) -> list[tuple[str, str]]:
    """슬롯 배정을 `(candidate_id, slot_name)` 목록으로 편다.

    기본키가 `(evidence_set_id, candidate_id)` 이므로 한 후보가 두 슬롯에 배정되어
    있으면 먼저 나온 슬롯만 남는다. 슬롯 배정은 `retrieval/evidence_set.py` 가
    후보마다 하나만 주므로 이 상황은 배정이 깨진 경우다.
    """
    rows: list[tuple[str, str]] = []
    seen: set[str] = set()
    for slot, candidate_ids in evidence_set.slot_assignment.items():
        for candidate_id in candidate_ids:
            if candidate_id in seen:
                continue
            seen.add(candidate_id)
            rows.append((candidate_id, slot))
    return rows


__all__ = [
    "DUPLICATE_RUN",
    "QUERY_PREFIX",
    "QUERY_STRATEGIES",
    "RUN_NOT_STARTED",
    "RUN_PREFIX",
    "UNKNOWN_STRATEGY",
    "UNRECORDED_CANDIDATE",
    "USAGE_PREFIX",
    "RetrievalRecorder",
    "RetrievalTelemetryStore",
    "candidate_row",
    "query_identifier",
    "retrieval_run_identifier",
    "usage_identifier",
    "usage_row",
]
