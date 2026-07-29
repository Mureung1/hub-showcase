"""릴리스 게이트.

수용 평가가 미달인 분석 버전을 `active` 로 올리지 못하게 막는다. 상태 전이 규칙은
docs/architecture.md 8장, 기준 항목은 docs/checklist.md 9장이다. 수용 평가는 활성화
이전 단계이며 `gated` 는 검증을 통과하고 수용 평가를 기다리는 상태다.

게이트는 상태를 올리지 않는다. 미달이면 `gated` 에 머무르게 두고 사유를 남기며,
충족이면 활성화해도 된다는 판정만 돌려준다. 활성화 자체는 Phase 21 의 일이고 직무
단위로 원자적으로 수행한다. 게이트가 활성화까지 하면 활성 버전 교체의 원자성이 두
곳으로 갈린다.

미달을 `failed` 로 옮기지도 않는다. `gated` 에서 `failed` 로 가는 길은 있으나 그
전이는 재실행 여부를 정하는 오케스트레이터의 판단이다. 게이트는 무엇이 기준에
못 미쳤는지만 남긴다.

저장소는 `Protocol` 로 받는다. `psycopg` 를 import 하지 않으므로 대역으로 검증할 수
있다. 실제 구현은 `careersignal.repositories.evaluation` 쪽이 맡는다. 평가 표는 평가
실행기의 쓰기 범위이고 `analysis_versions` 는 오케스트레이터의 쓰기 범위이므로
(docs/permission-matrix.md 3장) 두 쓰기를 한 객체 뒤에 두되 거래는 구현이 정한다.

채점은 판정과 무관하게 기록한다. 초안 세트의 결과도 추이 자료이므로
`evaluation_metrics` 와 `evaluation_failures` 에 남긴다.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Any, Protocol

from careersignal.domain.versioning import AnalysisVersionStatus, can_transition
from careersignal.evaluation.acceptance import (
    AcceptanceDecision,
    AcceptancePolicy,
    AcceptanceVerdict,
    judge_acceptance,
)
from careersignal.evaluation.scoring import ScoringResult, failure_rows, metric_rows

GATE_STATUS = AnalysisVersionStatus.GATED
"""수용 평가를 받는 상태. 이 상태의 버전만 심사한다."""

UNKNOWN_VERSION = "분석 버전이 없다"
NOT_AWAITING_GATE = "수용 평가를 기다리는 상태가 아니다"


class ReleaseGateError(ValueError):
    """게이트가 심사할 수 없는 입력이다."""


class ReleaseBlocked(RuntimeError):
    """수용 기준을 충족하지 않아 활성화를 막았다.

    활성화 경로가 판정을 무시하고 진행하지 못하게 하는 자리다. 판정을 값으로만
    돌려주면 부르는 쪽이 확인하지 않고 넘어갈 수 있다.
    """

    def __init__(self, outcome: GateOutcome) -> None:
        super().__init__(outcome.reason)
        self.outcome = outcome


class ReleaseGateStore(Protocol):
    """게이트가 저장소에 요구하는 것 넷. 좁게 잡아 대역으로 검증할 수 있게 한다."""

    def analysis_version_status(self, analysis_version: str) -> str | None:
        """`analysis_versions.status`. 행이 없으면 `None` 이다."""
        ...

    def add_metrics(self, rows: Sequence[Mapping[str, Any]]) -> None:
        """`evaluation_metrics` 에 넣는다. 기본키는 `(eval_run_id, metric_name)` 이다."""
        ...

    def add_failures(self, rows: Sequence[Mapping[str, Any]]) -> None:
        """`evaluation_failures` 에 넣는다."""
        ...

    def hold_gated(self, analysis_version: str, reason: str) -> None:
        """버전을 `gated` 에 두고 사유를 남긴다. 상태를 올리지 않는다."""
        ...


@dataclass(frozen=True, slots=True)
class GateOutcome:
    """게이트 심사 한 번의 결과."""

    analysis_version: str
    eval_run_id: str
    decision: AcceptanceDecision
    status: AnalysisVersionStatus | None
    activation_allowed: bool
    reason: str
    recorded_metrics: int = 0
    recorded_failures: int = 0

    @property
    def verdict(self) -> AcceptanceVerdict:
        return self.decision.verdict


class ReleaseGate:
    """수용 평가 결과로 활성화 가능 여부를 정한다."""

    def __init__(self, store: ReleaseGateStore, policy: AcceptancePolicy) -> None:
        self._store = store
        self._policy = policy

    @property
    def policy(self) -> AcceptancePolicy:
        return self._policy

    def review(
        self,
        analysis_version: str,
        eval_run_id: str,
        result: ScoringResult,
        *,
        set_status: str | None,
        rubric_status: str | None = None,
    ) -> GateOutcome:
        """채점 결과로 분석 버전을 심사한다.

        기록이 먼저다. 심사에서 무엇이 떨어졌는지는 지표와 실패 행이 있어야 나중에
        다시 볼 수 있고, 판정 뒤에 기록하면 판정이 예외로 끝난 실행의 채점 결과가
        사라진다.
        """
        metrics = metric_rows(eval_run_id, result)
        failures = failure_rows(eval_run_id, result)
        if metrics:
            self._store.add_metrics(metrics)
        if failures:
            self._store.add_failures(failures)

        current = self._current_status(analysis_version)
        decision = judge_acceptance(
            result.as_mapping(),
            self._policy,
            set_status=set_status,
            rubric_status=rubric_status,
        )

        if current is not GATE_STATUS:
            return GateOutcome(
                analysis_version=analysis_version,
                eval_run_id=eval_run_id,
                decision=decision,
                status=current,
                activation_allowed=False,
                reason=f"{NOT_AWAITING_GATE}: {current}",
                recorded_metrics=len(metrics),
                recorded_failures=len(failures),
            )

        if decision.blocks_activation:
            self._store.hold_gated(analysis_version, decision.reason)
            return GateOutcome(
                analysis_version=analysis_version,
                eval_run_id=eval_run_id,
                decision=decision,
                status=GATE_STATUS,
                activation_allowed=False,
                reason=decision.reason,
                recorded_metrics=len(metrics),
                recorded_failures=len(failures),
            )

        return GateOutcome(
            analysis_version=analysis_version,
            eval_run_id=eval_run_id,
            decision=decision,
            status=GATE_STATUS,
            activation_allowed=True,
            reason=decision.reason,
            recorded_metrics=len(metrics),
            recorded_failures=len(failures),
        )

    def _current_status(self, analysis_version: str) -> AnalysisVersionStatus:
        raw = self._store.analysis_version_status(analysis_version)
        if raw is None:
            raise ReleaseGateError(f"{UNKNOWN_VERSION}: {analysis_version}")
        try:
            return AnalysisVersionStatus(raw)
        except ValueError as error:
            raise ReleaseGateError(
                f"분석 버전 {analysis_version} 의 상태 {raw!r} 가 생명주기에 없다"
            ) from error


def require_activation_allowed(outcome: GateOutcome) -> GateOutcome:
    """활성화 경로가 게이트를 통과했는지 확인한다. 막혔으면 예외를 낸다."""
    if not outcome.activation_allowed:
        raise ReleaseBlocked(outcome)
    return outcome


def can_activate(outcome: GateOutcome) -> bool:
    """`gated` 에서 `active` 로 갈 수 있는가.

    게이트 판정과 생명주기 전이를 함께 본다. 판정이 통과여도 버전이 `gated` 가
    아니면 활성화 경로가 아니다.
    """
    if not outcome.activation_allowed or outcome.status is None:
        return False
    return can_transition(outcome.status, AnalysisVersionStatus.ACTIVE)
