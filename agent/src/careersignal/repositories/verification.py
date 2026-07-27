"""검증 결과 저장소.

검증 파이프라인이 사용한다. 쓰기 범위는 docs/permission-matrix.md 3장의
`verification_results`, `repair_orders`, `research_requests` 세 표다.

계약만 입력으로 받는다. 이 모듈은 `verification/` 을 import 하지 않으므로
검사 실행 방식이 바뀌어도 저장 경로는 그대로다.
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from typing import Any

from psycopg.types.json import Jsonb

from careersignal.contracts.check_result import CheckResult
from careersignal.contracts.repair import RepairOrder
from careersignal.contracts.research import ResearchRequest
from careersignal.domain.permissions import Component
from careersignal.repositories.base import Repository


def new_result_id() -> str:
    return f"ver_{uuid.uuid4().hex}"


def new_order_id() -> str:
    return f"rep_{uuid.uuid4().hex}"


def _jsonb(value: dict[str, Any] | None) -> Jsonb | None:
    """jsonb 컬럼에 넣을 값. 래퍼가 타입을 명시하므로 text 로 추론되지 않는다."""
    return None if value is None else Jsonb(value)


class VerificationRepository(Repository):
    component = Component.PIPE_VERIFY

    # ------------------------------------------------------------ 검사 결과
    def record_results(
        self, analysis_version: str, results: Sequence[CheckResult]
    ) -> tuple[str, ...]:
        """검사별 판정을 한 번에 기록한다.

        판정을 하나로 합치지 않는다. 어떤 검사가 무엇을 걸렀는지 남아야
        수리 지시와 재실행 범위를 정할 수 있다.
        """
        if not results:
            return ()
        rows: list[dict[str, Any]] = []
        result_ids: list[str] = []
        for result in results:
            result_id = new_result_id()
            result_ids.append(result_id)
            rows.append(
                {
                    "result_id": result_id,
                    "analysis_version": analysis_version,
                    "target_type": result.target_type,
                    "target_id": result.target_id,
                    "check_name": str(result.check),
                    "autonomy_level": str(result.autonomy_level),
                    "verdict": str(result.verdict),
                    "severity": str(result.severity),
                    "reason_code": result.reason_code,
                    "repair_action": (
                        str(result.repair_action) if result.repair_action else None
                    ),
                    "judge_model": result.judge_model,
                    "detail": _jsonb(result.detail),
                }
            )
        self.unit.insert_many("verification_results", rows)
        return tuple(result_ids)

    def results_for(
        self, analysis_version: str, target_type: str, target_id: str
    ) -> list[dict[str, Any]]:
        return self.unit.fetch_all(
            """
            SELECT * FROM verification_results
            WHERE analysis_version = %s AND target_type = %s AND target_id = %s
            ORDER BY created_at
            """,
            (analysis_version, target_type, target_id),
        )

    def blocking_results(self, analysis_version: str) -> list[dict[str, Any]]:
        """공개를 막는 판정. 인덱스가 이 조회를 위해 존재한다."""
        return self.unit.fetch_all(
            """
            SELECT * FROM verification_results
            WHERE analysis_version = %s AND verdict = 'fail' AND severity = 'blocking'
            ORDER BY created_at
            """,
            (analysis_version,),
        )

    # ------------------------------------------------------------ 검사 입력
    # 검증은 전 테이블을 읽는다. 정의는 docs/permission-matrix.md 4장이다.

    def mention_with_chunk(self, mention_id: str) -> dict[str, Any] | None:
        """근거 위치 검사의 입력. `chunk_id` 는 외래키라 없을 수 없다."""
        return self.unit.fetch_one(
            """
            SELECT m.mention_id, m.raw_expression, m.chunk_id,
                   m.evidence_span_start, m.evidence_span_end,
                   c.text AS chunk_text
            FROM requirement_mentions m
            JOIN source_chunks c ON c.chunk_id = m.chunk_id
            WHERE m.mention_id = %s
            """,
            (mention_id,),
        )

    def evidence_count(self, claim_id: str) -> int:
        return self.unit.fetch_value(
            "SELECT count(*) FROM analysis_claim_evidence WHERE claim_id = %s",
            (claim_id,),
        )

    def unresolved_supports(self, claim_id: str) -> list[dict[str, Any]]:
        """어느 표로도 해소되지 않는 근거.

        `support_id` 는 `support_type` 에 따라 가리키는 표가 넷으로 갈리는 다형
        참조라 외래키를 걸 수 없다. 데이터베이스가 막지 못하는 구간을 여기서 막는다.
        """
        return self.unit.fetch_all(
            """
            SELECT e.support_type, e.support_id, e.relation
            FROM analysis_claim_evidence e
            WHERE e.claim_id = %s
              AND NOT (
                (e.support_type = 'chunk' AND EXISTS (
                    SELECT 1 FROM source_chunks t WHERE t.chunk_id = e.support_id))
             OR (e.support_type = 'statistic_fact' AND EXISTS (
                    SELECT 1 FROM statistics_facts t WHERE t.fact_id = e.support_id))
             OR (e.support_type = 'graph_path' AND EXISTS (
                    SELECT 1 FROM graph_paths t WHERE t.path_id = e.support_id))
             OR (e.support_type = 'wiki_revision' AND EXISTS (
                    SELECT 1 FROM wiki_revisions t WHERE t.revision_id = e.support_id))
              )
            ORDER BY e.support_type, e.support_id
            """,
            (claim_id,),
        )

    # ------------------------------------------------------------ 자료 정책
    # 스냅샷에 평가가 여러 버전이면 최신 평가를 적용한다. 평가가 없으면 계층을
    # 알 수 없으므로 행은 돌려주되 평가 컬럼이 비어 있다.

    _LATEST_ASSESSMENT = """
        LEFT JOIN LATERAL (
            SELECT a.source_tier, a.allowed_uses, a.assessment_version
            FROM source_assessments a
            WHERE a.snapshot_id = s.snapshot_id
            ORDER BY a.assessed_at DESC, a.assessment_version DESC
            LIMIT 1
        ) a ON true
    """

    def claim_type(self, claim_id: str) -> str | None:
        return self.unit.fetch_value(
            "SELECT claim_type FROM analysis_claims WHERE claim_id = %s", (claim_id,)
        )

    def claim_source_policy(self, claim_id: str) -> list[dict[str, Any]]:
        """주장을 지지하는 청크 근거의 자료 계층과 허용 용도.

        반박 근거는 제외한다. 정책은 주장의 근거로 쓰는 것을 제한하며,
        반례 확보까지 막지 않는다. 상충 근거는 검사 7이 다룬다.
        """
        return self.unit.fetch_all(
            f"""
            SELECT e.support_id AS chunk_id, s.snapshot_id,
                   s.published_at, s.fetched_at,
                   a.source_tier, a.allowed_uses, a.assessment_version
            FROM analysis_claim_evidence e
            JOIN source_chunks c ON c.chunk_id = e.support_id
            JOIN source_snapshots s ON s.snapshot_id = c.snapshot_id
            {self._LATEST_ASSESSMENT}
            WHERE e.claim_id = %s
              AND e.support_type = 'chunk'
              AND e.relation = 'supports'
            ORDER BY e.support_id
            """,
            (claim_id,),
        )

    def wiki_source_policy(self, revision_id: str) -> list[dict[str, Any]]:
        """Wiki 개정판의 필드별 근거. 필드가 허용 용도와 일대일로 대응한다."""
        return self.unit.fetch_all(
            f"""
            SELECT w.field_name, w.chunk_id, s.snapshot_id,
                   s.published_at, s.fetched_at,
                   a.source_tier, a.allowed_uses, a.assessment_version
            FROM wiki_evidence w
            JOIN source_chunks c ON c.chunk_id = w.chunk_id
            JOIN source_snapshots s ON s.snapshot_id = c.snapshot_id
            {self._LATEST_ASSESSMENT}
            WHERE w.revision_id = %s
            ORDER BY w.field_name, w.chunk_id
            """,
            (revision_id,),
        )

    # ------------------------------------------------------------ 수리 지시
    def add_repair_order(
        self, agent_run_id: str, order: RepairOrder, order_id: str | None = None
    ) -> str:
        """수리 지시는 실행에 속한다. `agent_runs` 의 행이 먼저 있어야 한다."""
        assigned = order_id or new_order_id()
        self.unit.insert(
            "repair_orders",
            {
                "order_id": assigned,
                "agent_run_id": agent_run_id,
                "target_claim_id": order.target_claim_id,
                "failed_check": str(order.failed_check),
                "reason": order.reason,
                "action": str(order.action),
                "missing_evidence": _jsonb(
                    order.missing_evidence.model_dump(mode="json")
                    if order.missing_evidence
                    else None
                ),
                "requery_hint": order.requery_hint,
                "round": order.round,
            },
        )
        return assigned

    # ------------------------------------------------------------ 조사 요청
    def open_research_request(self, request: ResearchRequest) -> None:
        """`needs_research` 판정이 발행한다.

        에이전트의 `request_research` 와 같은 표를 쓰고, 상태는 오케스트레이터만
        갱신한다. 컬럼 단위 GRANT 가 이 경계를 강제한다.
        """
        self.unit.insert(
            "research_requests",
            {
                "request_id": request.request_id,
                "requested_by_run_id": request.requested_by_run_id,
                "analysis_version": request.analysis_version,
                "goal": request.goal,
                "needed_evidence_type": request.needed_evidence_type,
                "scope_level": str(request.scope_level),
                "scope_id": request.scope_id,
                "status": str(request.status),
                "priority": request.priority,
                "fulfilled_by_snapshot_ids": (
                    list(request.fulfilled_by_snapshot_ids) or None
                ),
            },
        )
