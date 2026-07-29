"""활성 버전 전환 검증.

절차는 docs/architecture.md 8장, 자리는 docs/erd.md 11.2 에서 온다. 저장소를
가짜로 대체하고 전환 조건과 실패 때의 보존만 검사한다. 데이터베이스에 접근하지
않는다.
"""

from __future__ import annotations

from typing import Any

import pytest

from careersignal.contracts.run_context import StopReason
from careersignal.contracts.verification import TypedVerdict
from careersignal.orchestration.activation import (
    GATE_SCOPE_LEVEL,
    REASON_BLOCKING_CHECK,
    REASON_JOB_MISMATCH,
    REASON_NOT_GATED,
    REASON_OUTPUT_MISSING,
    REASON_STATUS_UNKNOWN,
    REASON_UNKNOWN_VERDICT,
    REASON_VERSION_MISSING,
    REQUIRED_OUTPUT_TYPES,
    VersionActivation,
    refusal_summary,
    to_candidate,
)
from careersignal.orchestration.disclosure import (
    REASON_NOT_DISCLOSED,
    REASON_RUN_LIMIT,
    FollowUp,
)

JOB = "backend"
NEW_VERSION = "an_demo_backend_v2"
OLD_VERSION = "an_demo_backend_v1"


def _output_row(
    output_type: str,
    verification_status: str = "verified",
    stop_reason: str | None = "slots_filled",
    scope_level: str = GATE_SCOPE_LEVEL,
    open_research_requests: int = 0,
) -> dict[str, Any]:
    return {
        "output_id": f"out_demo_backend_{output_type}_{scope_level}",
        "output_type": output_type,
        "scope_level": scope_level,
        "scope_id": JOB,
        "verification_status": verification_status,
        "stop_reason": stop_reason,
        "open_research_requests": open_research_requests,
    }


def _full_outputs(**overrides: dict[str, Any]) -> list[dict[str, Any]]:
    """4종을 모두 갖춘 산출물 목록. 종류별로 값을 덮어쓸 수 있다."""
    rows = []
    for output_type in REQUIRED_OUTPUT_TYPES:
        row = _output_row(output_type)
        row.update(overrides.get(output_type, {}))
        rows.append(row)
    return rows


class FakeStore:
    """오케스트레이터 저장소의 대역. SQL 을 실행하지 않는다."""

    def __init__(
        self,
        version_row: dict[str, Any] | None = None,
        outputs: list[dict[str, Any]] | None = None,
        active: str | None = None,
    ) -> None:
        self._version_row = version_row
        self._outputs = outputs if outputs is not None else _full_outputs()
        self._active = active
        self.statuses: list[tuple[str, str]] = []
        self.activations: list[tuple[str, str]] = []

    def analysis_version_row(self, analysis_version: str) -> dict[str, Any] | None:
        if self._version_row is None:
            return None
        if self._version_row["analysis_version"] != analysis_version:
            return None
        return self._version_row

    def output_rows(self, analysis_version: str) -> list[dict[str, Any]]:
        return list(self._outputs)

    def active_version(self, job_role_id: str) -> str | None:
        return self._active

    def activate(self, job_role_id: str, analysis_version: str) -> None:
        self.activations.append((job_role_id, analysis_version))
        self._active = analysis_version

    def set_status(self, analysis_version: str, status: str) -> int:
        self.statuses.append((analysis_version, status))
        return 1

    @property
    def wrote(self) -> bool:
        return bool(self.statuses or self.activations)


class FakeGate:
    """차단 검증 판정의 대역."""

    def __init__(self, blocking: list[dict[str, Any]] | None = None) -> None:
        self._blocking = blocking or []

    def blocking_results(self, analysis_version: str) -> list[dict[str, Any]]:
        return list(self._blocking)


def _version(status: str = "gated", job_role_id: str = JOB) -> dict[str, Any]:
    return {
        "analysis_version": NEW_VERSION,
        "job_role_id": job_role_id,
        "status": status,
    }


def _run(
    store: FakeStore, gate: FakeGate | None = None, version: str = NEW_VERSION
) -> Any:
    return VersionActivation(store, gate or FakeGate()).run(JOB, version)


def _codes(outcome: Any) -> set[str]:
    return {r.reason_code for r in outcome.refusals}


# ------------------------------------------------------------ 21-1 원자 전환


def test_gated_version_with_all_outputs_activates() -> None:
    """조건을 다 갖추면 한 행의 전환이 일어난다."""
    store = FakeStore(_version(), active=OLD_VERSION)
    outcome = _run(store)

    assert outcome.activated is True
    assert outcome.refusals == ()
    assert store.activations == [(JOB, NEW_VERSION)]
    assert outcome.active_analysis_version == NEW_VERSION
    assert outcome.previous_analysis_version == OLD_VERSION


def test_previous_version_is_superseded_before_the_switch() -> None:
    """이전 버전을 내리고 새 버전을 올린 뒤에 전환 문장이 온다."""
    store = FakeStore(_version(), active=OLD_VERSION)
    outcome = _run(store)

    assert store.statuses == [(OLD_VERSION, "superseded"), (NEW_VERSION, "active")]
    assert outcome.superseded == 1


def test_first_activation_has_no_previous_version() -> None:
    """활성 버전이 없던 직무는 supersede 할 대상이 없다."""
    store = FakeStore(_version(), active=None)
    outcome = _run(store)

    assert outcome.activated is True
    assert outcome.superseded == 0
    assert store.statuses == [(NEW_VERSION, "active")]


def test_activating_the_active_version_writes_nothing() -> None:
    """이미 활성인 버전은 다시 쓰지 않는다."""
    store = FakeStore(_version(), active=NEW_VERSION)
    outcome = _run(store)

    assert outcome.already_active is True
    assert outcome.activated is False
    assert store.wrote is False
    assert outcome.active_analysis_version == NEW_VERSION


def test_all_four_outputs_switch_together() -> None:
    """4종이 한 번의 전환으로 함께 넘어간다. 화면별로 갈리지 않는다."""
    store = FakeStore(_version(), active=OLD_VERSION)
    outcome = _run(store)

    assert set(outcome.published_output_ids) == {
        f"out_demo_backend_{output_type}_{GATE_SCOPE_LEVEL}"
        for output_type in REQUIRED_OUTPUT_TYPES
    }
    assert len(store.activations) == 1


# ------------------------------------------------------------ 21-2 실패 보존


def test_missing_version_row_keeps_previous_active() -> None:
    store = FakeStore(None, active=OLD_VERSION)
    outcome = _run(store)

    assert _codes(outcome) == {REASON_VERSION_MISSING}
    assert outcome.kept_previous is True
    assert outcome.active_analysis_version == OLD_VERSION
    assert store.wrote is False


def test_other_job_version_is_refused() -> None:
    """다른 직무의 버전으로 이 직무의 화면을 바꾸지 않는다."""
    store = FakeStore(_version(job_role_id="frontend"), active=OLD_VERSION)
    outcome = _run(store)

    assert _codes(outcome) == {REASON_JOB_MISMATCH}
    assert store.wrote is False


@pytest.mark.parametrize(
    "status", ["draft", "running", "validating", "failed", "superseded"]
)
def test_non_gated_version_is_refused(status: str) -> None:
    """`gated` 만 `active` 로 간다."""
    store = FakeStore(_version(status=status), active=OLD_VERSION)
    outcome = _run(store)

    assert REASON_NOT_GATED in _codes(outcome)
    assert outcome.active_analysis_version == OLD_VERSION
    assert store.wrote is False


def test_unknown_status_is_refused() -> None:
    store = FakeStore(_version(status="ready"), active=OLD_VERSION)
    outcome = _run(store)

    assert REASON_STATUS_UNKNOWN in _codes(outcome)
    assert store.wrote is False


@pytest.mark.parametrize("missing", REQUIRED_OUTPUT_TYPES)
def test_missing_output_type_blocks_the_switch(missing: str) -> None:
    """산출물 한 종류가 비면 나머지 세 화면도 이전 버전에 머문다."""
    rows = [r for r in _full_outputs() if r["output_type"] != missing]
    store = FakeStore(_version(), outputs=rows, active=OLD_VERSION)
    outcome = _run(store)

    assert _codes(outcome) == {REASON_OUTPUT_MISSING}
    assert [r.target for r in outcome.refusals] == [missing]
    assert store.wrote is False
    assert outcome.active_analysis_version == OLD_VERSION


def test_non_disclosed_output_counts_as_missing() -> None:
    """비공개 판정의 산출물은 있어도 없는 것과 같다."""
    store = FakeStore(
        _version(),
        outputs=_full_outputs(roadmap={"verification_status": "needs_research"}),
        active=OLD_VERSION,
    )
    outcome = _run(store)

    refusal = next(
        r for r in outcome.refusals if r.reason_code == REASON_OUTPUT_MISSING
    )
    assert refusal.target == "roadmap"
    assert REASON_NOT_DISCLOSED in refusal.detail
    assert store.wrote is False


def test_limit_reached_output_counts_as_missing() -> None:
    """한도에 걸려 조사를 마치지 못한 결과는 활성 버전에 넣지 않는다."""
    store = FakeStore(
        _version(),
        outputs=_full_outputs(strategy={"stop_reason": "budget_exhausted"}),
        active=OLD_VERSION,
    )
    outcome = _run(store)

    refusal = next(
        r for r in outcome.refusals if r.reason_code == REASON_OUTPUT_MISSING
    )
    assert refusal.target == "strategy"
    assert REASON_RUN_LIMIT in refusal.detail
    assert store.wrote is False


def test_blocking_verification_blocks_the_switch() -> None:
    """차단 등급 실패가 남아 있으면 전환하지 않는다."""
    gate = FakeGate(
        [
            {
                "target_id": "claim_demo_backend_000001",
                "check_name": "citation_span_validator",
            }
        ]
    )
    store = FakeStore(_version(), active=OLD_VERSION)
    outcome = _run(store, gate)

    assert _codes(outcome) == {REASON_BLOCKING_CHECK}
    assert outcome.refusals[0].target == "claim_demo_backend_000001"
    assert outcome.refusals[0].detail == "citation_span_validator"
    assert store.wrote is False


def test_unknown_verification_status_is_refused() -> None:
    """일곱 값 밖의 판정은 공개 여부를 정할 수 없다."""
    store = FakeStore(
        _version(),
        outputs=_full_outputs(interpretation={"verification_status": "ok"}),
        active=OLD_VERSION,
    )
    outcome = _run(store)

    assert REASON_UNKNOWN_VERDICT in _codes(outcome)
    assert store.wrote is False


def test_refusals_accumulate_across_checks() -> None:
    """사유를 하나만 내고 멈추지 않는다. 무엇을 고쳐야 하는지 한 번에 보인다."""
    store = FakeStore(
        _version(status="running"),
        outputs=[_output_row("statistics")],
        active=OLD_VERSION,
    )
    outcome = _run(store, FakeGate([{"target_id": "claim_x", "check_name": "schema"}]))

    summary = refusal_summary(outcome)
    assert summary[REASON_NOT_GATED] == 1
    assert summary[REASON_BLOCKING_CHECK] == 1
    assert summary[REASON_OUTPUT_MISSING] == 3
    assert store.wrote is False


# ------------------------------------------------------------ 21-3 연결


def test_warning_verdict_is_published_with_a_follow_up() -> None:
    """경고 판정은 공개하되 후속 동작을 남긴다."""
    store = FakeStore(
        _version(),
        outputs=_full_outputs(
            statistics={"verification_status": "verified_with_warning"}
        ),
        active=OLD_VERSION,
    )
    outcome = _run(store)

    assert outcome.activated is True
    assert FollowUp.SHOW_WARNING in outcome.follow_ups


def test_narrow_scope_output_does_not_gate_the_switch() -> None:
    """공고 범위 산출물이 걸러져도 직무 전체 범위 4종이 서면 전환한다."""
    rows = _full_outputs()
    rows.append(
        _output_row(
            "interpretation",
            verification_status="contradicted",
            scope_level="posting",
        )
    )
    store = FakeStore(_version(), outputs=rows, active=OLD_VERSION)
    outcome = _run(store)

    assert outcome.activated is True
    assert outcome.excluded_outputs == (
        ("out_demo_backend_interpretation_posting", REASON_NOT_DISCLOSED),
    )


def test_to_candidate_reads_row_values() -> None:
    candidate = to_candidate(_output_row("statistics"))
    assert candidate is not None
    assert candidate.verdict is TypedVerdict.VERIFIED
    assert candidate.stop_reason is StopReason.SLOTS_FILLED


def test_to_candidate_rejects_unknown_verdict() -> None:
    assert to_candidate(_output_row("statistics", verification_status="ok")) is None


def test_to_candidate_ignores_unknown_stop_reason() -> None:
    """종료 사유를 읽지 못하면 한도 판단만 못 한다. 산출물을 버리지 않는다."""
    candidate = to_candidate(_output_row("statistics", stop_reason="done"))
    assert candidate is not None
    assert candidate.stop_reason is None
