"""릴리스 게이트 검증.

상태 전이는 docs/architecture.md 8장, 기준 항목은 docs/checklist.md 9장에서 온다.
저장소는 `Protocol` 이므로 대역으로 검증한다.
"""

from __future__ import annotations

import ast
from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import Any

import pytest

from careersignal.domain.versioning import AnalysisVersionStatus
from careersignal.evaluation.acceptance import (
    CONFIRMED_STATUS,
    DRAFT_STATUS,
    AcceptancePolicy,
    AcceptanceVerdict,
    Threshold,
)
from careersignal.evaluation.gate import (
    NOT_AWAITING_GATE,
    ReleaseBlocked,
    ReleaseGate,
    ReleaseGateError,
    can_activate,
    require_activation_allowed,
)
from careersignal.evaluation.schema import EvaluationSetFile
from careersignal.evaluation.scoring import (
    MENTION_PRECISION,
    MENTION_RECALL,
    Observation,
    ObservedCase,
    score_evaluation_set,
)

ANALYSIS_VERSION = "an_backend_1"
RUN_ID = "evalrun_1"

POLICY = AcceptancePolicy(
    acceptance_policy_version="ap_v1",
    rubric_set_id="rubrics_v1",
    thresholds=(
        Threshold(metric_name=MENTION_PRECISION, minimum=0.7),
        Threshold(metric_name=MENTION_RECALL, minimum=0.7),
    ),
)
"""검증용 기준. 코드가 아니라 부르는 쪽이 정한다는 것을 그대로 보인다."""


class FakeGateStore:
    """게이트 저장소의 대역."""

    def __init__(self, status: str | None = AnalysisVersionStatus.GATED) -> None:
        self.status = status
        self.metrics: list[dict[str, Any]] = []
        self.failures: list[dict[str, Any]] = []
        self.holds: list[tuple[str, str]] = []

    def analysis_version_status(self, analysis_version: str) -> str | None:
        return self.status

    def add_metrics(self, rows: Sequence[Mapping[str, Any]]) -> None:
        self.metrics.extend(dict(row) for row in rows)

    def add_failures(self, rows: Sequence[Mapping[str, Any]]) -> None:
        self.failures.extend(dict(row) for row in rows)

    def hold_gated(self, analysis_version: str, reason: str) -> None:
        self.holds.append((analysis_version, reason))


def _document(expressions: list[str]) -> EvaluationSetFile:
    return EvaluationSetFile.model_validate(
        {
            "job_role_id": "backend",
            "source_file": "docs/eval/test.json",
            "cases": [
                {
                    "case_id": "case_1",
                    "case_type": "mention_extraction",
                    "expected_items": [
                        {
                            "expected_id": f"exp_{index}",
                            "expected_field": "requirement_mention",
                            "expected_value": {
                                "raw_expression": expression,
                                "requiredness": "required",
                            },
                        }
                        for index, expression in enumerate(expressions)
                    ],
                }
            ],
        }
    )


def _result(hit: int, total: int):
    """앞의 `hit` 개만 맞힌 실행의 채점 결과."""
    expressions = [f"요구 {index}" for index in range(total)]
    document = _document(expressions)
    observed = ObservedCase(
        case_id="case_1",
        observations=tuple(
            Observation(value={"raw_expression": expression, "requiredness": "required"})
            for expression in expressions[:hit]
        ),
    )
    return score_evaluation_set(document, [observed])


# ------------------------------------------------------------ 20-3 차단
def test_shortfall_keeps_the_version_gated_and_leaves_a_reason() -> None:
    """미달이면 `active` 로 올리지 못한다. `gated` 에 머무르고 사유를 남긴다."""
    store = FakeGateStore()
    gate = ReleaseGate(store, POLICY)

    outcome = gate.review(
        ANALYSIS_VERSION,
        RUN_ID,
        _result(hit=1, total=4),
        set_status=CONFIRMED_STATUS,
        rubric_status=CONFIRMED_STATUS,
    )

    assert outcome.verdict is AcceptanceVerdict.FAIL
    assert outcome.activation_allowed is False
    assert outcome.status is AnalysisVersionStatus.GATED
    assert store.status == AnalysisVersionStatus.GATED
    assert store.holds == [(ANALYSIS_VERSION, outcome.reason)]
    assert MENTION_RECALL in outcome.reason
    assert can_activate(outcome) is False


def test_shortfall_creates_evaluation_failure_rows() -> None:
    """채점 실패는 `evaluation_failures` 행이 된다."""
    store = FakeGateStore()
    gate = ReleaseGate(store, POLICY)

    outcome = gate.review(
        ANALYSIS_VERSION,
        RUN_ID,
        _result(hit=1, total=4),
        set_status=CONFIRMED_STATUS,
        rubric_status=CONFIRMED_STATUS,
    )

    assert outcome.recorded_failures == len(store.failures) == 3
    assert {row["eval_run_id"] for row in store.failures} == {RUN_ID}
    assert {row["case_id"] for row in store.failures} == {"case_1"}
    assert len({row["failure_id"] for row in store.failures}) == 3


def test_blocked_outcome_raises_on_the_activation_path() -> None:
    """판정을 확인하지 않고 활성화로 넘어가지 못하게 한다."""
    store = FakeGateStore()
    gate = ReleaseGate(store, POLICY)
    outcome = gate.review(
        ANALYSIS_VERSION,
        RUN_ID,
        _result(hit=0, total=4),
        set_status=CONFIRMED_STATUS,
        rubric_status=CONFIRMED_STATUS,
    )

    with pytest.raises(ReleaseBlocked) as error:
        require_activation_allowed(outcome)

    assert error.value.outcome is outcome


# ------------------------------------------------------------ 20-3 통과
def test_meeting_every_threshold_allows_activation() -> None:
    store = FakeGateStore()
    gate = ReleaseGate(store, POLICY)

    outcome = gate.review(
        ANALYSIS_VERSION,
        RUN_ID,
        _result(hit=4, total=4),
        set_status=CONFIRMED_STATUS,
        rubric_status=CONFIRMED_STATUS,
    )

    assert outcome.verdict is AcceptanceVerdict.PASS
    assert outcome.activation_allowed is True
    assert can_activate(outcome) is True
    assert store.holds == []
    assert require_activation_allowed(outcome) is outcome


def test_gate_does_not_activate_the_version_itself() -> None:
    """상태를 올리는 것은 Phase 21 이다. 게이트는 판정만 돌려준다."""
    store = FakeGateStore()
    gate = ReleaseGate(store, POLICY)

    gate.review(
        ANALYSIS_VERSION,
        RUN_ID,
        _result(hit=4, total=4),
        set_status=CONFIRMED_STATUS,
        rubric_status=CONFIRMED_STATUS,
    )

    assert store.status == AnalysisVersionStatus.GATED


# ------------------------------------------------------------ 초안 세트
def test_draft_set_is_recorded_but_does_not_block() -> None:
    """초안 세트의 채점은 추이 자료다. 미달이어도 활성화를 막지 않는다."""
    store = FakeGateStore()
    gate = ReleaseGate(store, POLICY)

    outcome = gate.review(
        ANALYSIS_VERSION,
        RUN_ID,
        _result(hit=1, total=4),
        set_status=DRAFT_STATUS,
        rubric_status=CONFIRMED_STATUS,
    )

    assert outcome.verdict is AcceptanceVerdict.NOT_GATING
    assert outcome.activation_allowed is True
    assert store.holds == []
    assert outcome.recorded_metrics == len(store.metrics) == 3
    assert store.failures != []


def test_draft_rubric_is_not_gating() -> None:
    store = FakeGateStore()
    gate = ReleaseGate(store, POLICY)

    outcome = gate.review(
        ANALYSIS_VERSION,
        RUN_ID,
        _result(hit=0, total=4),
        set_status=CONFIRMED_STATUS,
        rubric_status=DRAFT_STATUS,
    )

    assert outcome.verdict is AcceptanceVerdict.NOT_GATING
    assert store.holds == []


# ------------------------------------------------------------ 상태 전제
def test_version_outside_the_gate_state_is_not_activated() -> None:
    """`gated` 가 아닌 버전은 활성화 경로가 아니다."""
    store = FakeGateStore(status=AnalysisVersionStatus.RUNNING)
    gate = ReleaseGate(store, POLICY)

    outcome = gate.review(
        ANALYSIS_VERSION,
        RUN_ID,
        _result(hit=4, total=4),
        set_status=CONFIRMED_STATUS,
        rubric_status=CONFIRMED_STATUS,
    )

    assert outcome.activation_allowed is False
    assert NOT_AWAITING_GATE in outcome.reason
    assert store.holds == []
    assert store.metrics != []


def test_unknown_version_is_rejected() -> None:
    gate = ReleaseGate(FakeGateStore(status=None), POLICY)

    with pytest.raises(ReleaseGateError):
        gate.review(
            ANALYSIS_VERSION,
            RUN_ID,
            _result(hit=4, total=4),
            set_status=CONFIRMED_STATUS,
            rubric_status=CONFIRMED_STATUS,
        )


def test_status_outside_the_lifecycle_is_rejected() -> None:
    gate = ReleaseGate(FakeGateStore(status="released"), POLICY)

    with pytest.raises(ReleaseGateError):
        gate.review(
            ANALYSIS_VERSION,
            RUN_ID,
            _result(hit=4, total=4),
            set_status=CONFIRMED_STATUS,
            rubric_status=CONFIRMED_STATUS,
        )


def test_scoring_is_recorded_before_the_verdict() -> None:
    """판정이 예외로 끝나도 채점 결과는 남는다."""
    store = FakeGateStore(status="released")
    gate = ReleaseGate(store, POLICY)

    with pytest.raises(ReleaseGateError):
        gate.review(
            ANALYSIS_VERSION,
            RUN_ID,
            _result(hit=2, total=4),
            set_status=CONFIRMED_STATUS,
            rubric_status=CONFIRMED_STATUS,
        )

    assert store.metrics != []
    assert store.failures != []


# ------------------------------------------------------------ 경계
GATE_MODULE = (
    Path(__file__).resolve().parents[2]
    / "src"
    / "careersignal"
    / "evaluation"
    / "gate.py"
)

FORBIDDEN = {"psycopg", "careersignal.repositories"}


def test_gate_receives_its_store_and_does_not_import_one() -> None:
    """저장소는 `Protocol` 로 받는다. `psycopg` 가 따라오지 않는다."""
    tree = ast.parse(GATE_MODULE.read_text(encoding="utf-8"))
    imported: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imported.update(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            imported.add(node.module)

    bad = [
        name
        for name in imported
        if name in FORBIDDEN or name.split(".")[0] in FORBIDDEN
    ]
    assert bad == []
    assert "Protocol" in GATE_MODULE.read_text(encoding="utf-8")
