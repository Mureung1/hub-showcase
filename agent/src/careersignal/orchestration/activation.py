"""활성 버전 전환.

절차는 docs/architecture.md 8장이고 자리는 docs/erd.md 11.2 다.
`active_analysis_versions` 는 직무를 기본키로 두므로 전환이 한 행의 `UPDATE` 이고,
그래서 원자적이다. 화면이 다섯이어도 조회는 이 한 행을 거쳐 버전을 고르므로 한
화면만 새 버전이고 다른 화면은 이전 버전인 상태가 생기지 않는다.

전환은 검사를 통과한 뒤에만 한다. 검사는 셋이다.

1. 대상 버전의 상태가 `gated` 인가(docs/architecture.md 8장의 생명주기).
2. 그 직무의 산출물 4종이 모두 공개 가능한 상태로 있는가(docs/erd.md 11.3).
3. 차단 검증 실패가 없는가(docs/agent-design.md 9장).

하나라도 어긋나면 아무것도 쓰지 않는다. 검사에 걸린 버전을 부분적으로 반영하면
통계는 새 버전이고 로드맵은 옛 버전인 화면이 나오므로, 전환하거나 전부 그대로
두거나 둘 중 하나다. 기존 활성 버전은 손대지 않고 남고 실패 사유를 구조화해
돌려준다(`ActivationOutcome.refusals`).

무엇을 넣을지는 `orchestration.disclosure` 가 정한다. 이 모듈은 그 판정을 실행
순서로 옮길 뿐이며 공개 규칙을 다시 적지 않는다.

저장소는 `Protocol` 로 받는다. SQL 도 `psycopg` 도 모르므로 대역으로 검사할 수 있다.
"""

from __future__ import annotations

from typing import Any, Protocol

from pydantic import BaseModel, ConfigDict

from careersignal.contracts.run_context import StopReason
from careersignal.contracts.verification import TypedVerdict
from careersignal.domain.scope import ScopeLevel
from careersignal.domain.versioning import AnalysisVersionStatus, can_transition
from careersignal.orchestration.disclosure import (
    FollowUp,
    OutputCandidate,
    OutputScreening,
    disclosure_for,
    follow_ups,
    screen_outputs,
)

REQUIRED_OUTPUT_TYPES: tuple[str, ...] = (
    "statistics",
    "interpretation",
    "strategy",
    "roadmap",
)
"""활성 버전이 갖춰야 하는 산출물 4종. `analysis_outputs.output_type` 의 CHECK 값이다.

화면이 이 넷에 대응한다(docs/architecture.md 10.2). 하나가 비면 그 화면만 이전
버전을 읽게 되므로, 넷이 다 서기 전에는 전환하지 않는다.
"""

GATE_SCOPE_LEVEL = str(ScopeLevel.OVERALL)
"""4종을 요구하는 범위. 직무 전체 범위다.

기업군·공고 범위의 산출물은 자료가 있는 만큼만 생기지만 직무 전체 범위는 어느
직무에나 있어야 한다. 이 범위의 넷이 전환의 최소 조건이다.
"""

# ------------------------------------------------------------ 거절 사유

REASON_VERSION_MISSING = "analysis_version_missing"
"""전환하려는 분석 버전 행이 없다."""

REASON_JOB_MISMATCH = "job_role_mismatch"
"""분석 버전이 다른 직무의 것이다. 남의 직무 화면을 바꾸지 않는다."""

REASON_STATUS_UNKNOWN = "status_unknown"
"""생명주기에 없는 상태 값이다."""

REASON_NOT_GATED = "status_not_gated"
"""`gated` 가 아닌 버전이다. 수용 평가를 통과한 버전만 활성화한다."""

REASON_BLOCKING_CHECK = "blocking_verification"
"""차단 등급 검증 실패가 남아 있다."""

REASON_OUTPUT_MISSING = "required_output_missing"
"""직무 전체 범위의 산출물 4종 가운데 빠진 종류가 있다."""

REASON_UNKNOWN_VERDICT = "verification_status_unknown"
"""산출물의 검증 판정이 일곱 값 밖이다. 공개 여부를 정할 수 없다."""


class ActivationRefusal(BaseModel):
    """전환하지 않은 사유 하나."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    reason_code: str
    target: str
    """사유가 가리키는 것. 버전 식별자, 산출물 식별자, 산출물 종류 가운데 하나다."""

    detail: str = ""


class ActivationOutcome(BaseModel):
    """전환 시도 하나의 결과."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    job_role_id: str
    analysis_version: str
    """전환하려 한 버전."""

    activated: bool = False
    already_active: bool = False
    """이미 활성인 버전을 다시 전환하려 했다. 쓰기는 하지 않는다."""

    previous_analysis_version: str | None = None
    """시도 전의 활성 버전. 없었으면 비운다."""

    active_analysis_version: str | None = None
    """시도 뒤의 활성 버전. 전환하지 않았으면 이전 값과 같다."""

    superseded: int = 0
    """`superseded` 로 내린 버전 수. 첫 활성화면 0, 교체면 1 이다."""

    published_output_ids: tuple[str, ...] = ()
    """활성 버전에 넣기로 한 산출물."""

    excluded_outputs: tuple[tuple[str, str], ...] = ()
    """(`output_id`, 사유 코드). 공개 정책과 실행 한도가 뺀 산출물이다."""

    follow_ups: tuple[FollowUp, ...] = ()
    """판정이 부른 후속 동작. 오케스트레이터가 조사 요청과 폐기를 여기서 읽는다."""

    refusals: tuple[ActivationRefusal, ...] = ()

    @property
    def kept_previous(self) -> bool:
        """전환하지 않고 기존 활성 버전을 그대로 둔 실행인가."""
        return not self.activated and self.active_analysis_version == (
            self.previous_analysis_version
        )


class ActivationStore(Protocol):
    """전환이 저장소에 요구하는 것.

    `repositories.telemetry.OrchestratorRepository` 가 `active_version`·`activate`·
    `set_status` 를 이 모양으로 갖는다. 나머지 두 읽기도 같은 구성요소의 읽기
    범위다(docs/permission-matrix.md 3장).
    """

    def analysis_version_row(self, analysis_version: str) -> dict[str, Any] | None: ...

    def output_rows(self, analysis_version: str) -> list[dict[str, Any]]: ...

    def active_version(self, job_role_id: str) -> str | None: ...

    def activate(self, job_role_id: str, analysis_version: str) -> None: ...

    def set_status(self, analysis_version: str, status: str) -> int: ...


class VerificationGate(Protocol):
    """차단 검증 실패를 읽는다. `repositories.verification.VerificationRepository` 다."""

    def blocking_results(self, analysis_version: str) -> list[dict[str, Any]]: ...


def to_candidate(row: dict[str, Any]) -> OutputCandidate | None:
    """`analysis_outputs` 한 행을 공개 판단 입력으로 옮긴다.

    판정이 일곱 값 밖이면 비운다. 모르는 값을 공개 쪽으로도 비공개 쪽으로도 밀지
    않고 부른 쪽이 거절 사유로 삼는다.

    `stop_reason` 은 그 산출물을 만든 실행의 종료 사유다. 행에 없으면 한도 판단을
    하지 않는다.
    """
    try:
        verdict = TypedVerdict(row["verification_status"])
    except ValueError:
        return None

    raw_stop = row.get("stop_reason")
    stop_reason: StopReason | None = None
    if raw_stop is not None:
        try:
            stop_reason = StopReason(raw_stop)
        except ValueError:
            stop_reason = None

    return OutputCandidate(
        output_id=row["output_id"],
        output_type=row["output_type"],
        scope_level=row["scope_level"],
        scope_id=row["scope_id"],
        verdict=verdict,
        stop_reason=stop_reason,
        open_research_requests=int(row.get("open_research_requests") or 0),
    )


class VersionActivation:
    """검사를 통과한 분석 버전을 직무의 활성 버전으로 세운다."""

    def __init__(self, store: ActivationStore, gate: VerificationGate) -> None:
        self._store = store
        self._gate = gate

    def run(self, job_role_id: str, analysis_version: str) -> ActivationOutcome:
        """전환을 시도한다. 검사에 걸리면 아무것도 쓰지 않는다.

        읽기를 모두 마치고 거절 사유를 모은 다음에 쓴다. 검사 사이에 쓰기를 끼우면
        뒤 검사가 걸렸을 때 앞의 쓰기가 남아 절반만 바뀐 상태가 된다.
        """
        previous = self._store.active_version(job_role_id)
        refusals: list[ActivationRefusal] = []

        row = self._store.analysis_version_row(analysis_version)
        if row is None:
            refusals.append(
                ActivationRefusal(
                    reason_code=REASON_VERSION_MISSING,
                    target=analysis_version,
                    detail="분석 버전 행이 없다",
                )
            )
            return self._refused(job_role_id, analysis_version, previous, refusals)

        if row.get("job_role_id") != job_role_id:
            refusals.append(
                ActivationRefusal(
                    reason_code=REASON_JOB_MISMATCH,
                    target=analysis_version,
                    detail=f"{row.get('job_role_id')} 의 버전이다",
                )
            )
            return self._refused(job_role_id, analysis_version, previous, refusals)

        refusals.extend(self._status_refusals(row, analysis_version))
        refusals.extend(self._blocking_refusals(analysis_version))

        candidates, screening, unknown = self._screen(analysis_version)
        refusals.extend(unknown)
        refusals.extend(self._coverage_refusals(candidates, screening))

        if refusals:
            return self._refused(
                job_role_id, analysis_version, previous, refusals, screening
            )
        return self._switch(job_role_id, analysis_version, previous, screening)

    # ------------------------------------------------------------ 검사
    def _status_refusals(
        self, row: dict[str, Any], analysis_version: str
    ) -> list[ActivationRefusal]:
        """상태가 `gated` 인가. 전이 규칙으로 확인한다.

        `gated` 만 `active` 로 갈 수 있다(`domain.versioning`). 상태 문자열을 직접
        비교하지 않고 전이표에 묻는 이유는 생명주기가 한 자리에서만 정의되게
        하기 위해서다.
        """
        try:
            status = AnalysisVersionStatus(row.get("status"))
        except ValueError:
            return [
                ActivationRefusal(
                    reason_code=REASON_STATUS_UNKNOWN,
                    target=analysis_version,
                    detail=f"{row.get('status')!r} 는 생명주기 상태가 아니다",
                )
            ]
        if not can_transition(status, AnalysisVersionStatus.ACTIVE):
            return [
                ActivationRefusal(
                    reason_code=REASON_NOT_GATED,
                    target=analysis_version,
                    detail=f"{status} 에서 active 로 전이할 수 없다",
                )
            ]
        return []

    def _blocking_refusals(self, analysis_version: str) -> list[ActivationRefusal]:
        """차단 등급 검증 실패. 한 건이라도 있으면 전환하지 않는다."""
        blocking = self._gate.blocking_results(analysis_version)
        return [
            ActivationRefusal(
                reason_code=REASON_BLOCKING_CHECK,
                target=str(result.get("target_id") or analysis_version),
                detail=str(result.get("check_name") or result.get("reason_code") or ""),
            )
            for result in blocking
        ]

    def _screen(
        self, analysis_version: str
    ) -> tuple[
        tuple[OutputCandidate, ...], OutputScreening, list[ActivationRefusal]
    ]:
        """산출물을 공개 정책으로 거른다. 판정을 읽지 못한 행은 거절 사유가 된다.

        거르기 전의 목록도 함께 돌려준다. 빠진 종류가 애초에 없었는지 걸러졌는지는
        거르기 전 목록을 봐야 갈린다.
        """
        candidates: list[OutputCandidate] = []
        unknown: list[ActivationRefusal] = []
        for row in self._store.output_rows(analysis_version):
            candidate = to_candidate(row)
            if candidate is None:
                unknown.append(
                    ActivationRefusal(
                        reason_code=REASON_UNKNOWN_VERDICT,
                        target=str(row.get("output_id") or analysis_version),
                        detail=f"{row.get('verification_status')!r}",
                    )
                )
                continue
            candidates.append(candidate)
        return tuple(candidates), screen_outputs(candidates), unknown

    def _coverage_refusals(
        self,
        candidates: tuple[OutputCandidate, ...],
        screening: OutputScreening,
    ) -> list[ActivationRefusal]:
        """직무 전체 범위의 4종이 다 남았는가.

        빠진 종류마다 사유를 하나씩 낸다. 무엇이 없어서 전환하지 못했는지 종류
        단위로 보여야 다음 실행이 그 산출물만 다시 만든다.
        """
        present = {
            output.output_type
            for output in screening.published
            if output.scope_level == GATE_SCOPE_LEVEL
        }
        reasons = dict(screening.excluded)
        return [
            ActivationRefusal(
                reason_code=REASON_OUTPUT_MISSING,
                target=output_type,
                detail=self._missing_detail(candidates, reasons, output_type),
            )
            for output_type in REQUIRED_OUTPUT_TYPES
            if output_type not in present
        ]

    @staticmethod
    def _missing_detail(
        candidates: tuple[OutputCandidate, ...],
        reasons: dict[str, str],
        output_type: str,
    ) -> str:
        """빠진 종류가 애초에 없었는지 걸러졌는지 적는다."""
        for candidate in candidates:
            if (
                candidate.output_type == output_type
                and candidate.scope_level == GATE_SCOPE_LEVEL
                and candidate.output_id in reasons
            ):
                return f"{candidate.output_id} 가 {reasons[candidate.output_id]} 로 빠졌다"
        return f"{GATE_SCOPE_LEVEL} 범위의 {output_type} 산출물이 없다"

    # ------------------------------------------------------------ 전환
    def _switch(
        self,
        job_role_id: str,
        analysis_version: str,
        previous: str | None,
        screening: OutputScreening,
    ) -> ActivationOutcome:
        """검사를 통과했다. 이전 버전을 내리고 새 버전을 세운다.

        마지막 쓰기가 `active_analysis_versions` 한 행의 갱신이다. 그 앞의 상태
        갱신이 실패하면 전환 문장에 닿지 않고, 거래가 끊기면 셋 다 되돌아간다.
        """
        if previous == analysis_version:
            return self._outcome(
                job_role_id,
                analysis_version,
                previous,
                screening,
                activated=False,
                already_active=True,
                active=previous,
            )

        superseded = 0
        if previous is not None:
            superseded = self._store.set_status(
                previous, str(AnalysisVersionStatus.SUPERSEDED)
            )
        self._store.set_status(analysis_version, str(AnalysisVersionStatus.ACTIVE))
        self._store.activate(job_role_id, analysis_version)
        return self._outcome(
            job_role_id,
            analysis_version,
            previous,
            screening,
            activated=True,
            active=analysis_version,
            superseded=superseded,
        )

    # ------------------------------------------------------------ 결과
    def _refused(
        self,
        job_role_id: str,
        analysis_version: str,
        previous: str | None,
        refusals: list[ActivationRefusal],
        screening: OutputScreening | None = None,
    ) -> ActivationOutcome:
        """전환하지 않은 결과. 활성 버전은 시도 전 값 그대로다."""
        return self._outcome(
            job_role_id,
            analysis_version,
            previous,
            screening or OutputScreening(published=(), excluded=()),
            activated=False,
            active=previous,
            refusals=tuple(refusals),
        )

    @staticmethod
    def _outcome(
        job_role_id: str,
        analysis_version: str,
        previous: str | None,
        screening: OutputScreening,
        *,
        activated: bool,
        active: str | None,
        already_active: bool = False,
        superseded: int = 0,
        refusals: tuple[ActivationRefusal, ...] = (),
    ) -> ActivationOutcome:
        return ActivationOutcome(
            job_role_id=job_role_id,
            analysis_version=analysis_version,
            activated=activated,
            already_active=already_active,
            previous_analysis_version=previous,
            active_analysis_version=active,
            superseded=superseded,
            published_output_ids=tuple(o.output_id for o in screening.published),
            excluded_outputs=screening.excluded,
            follow_ups=follow_ups(o.verdict for o in screening.published),
            refusals=refusals,
        )


def refusal_summary(outcome: ActivationOutcome) -> dict[str, int]:
    """사유 코드별 건수. 계측에 넣는 값이다(docs/architecture.md 14.2)."""
    counts: dict[str, int] = {}
    for refusal in outcome.refusals:
        counts[refusal.reason_code] = counts.get(refusal.reason_code, 0) + 1
    return counts


def warned_outputs(
    screening: OutputScreening,
) -> tuple[str, ...]:
    """경고를 함께 표시해야 하는 산출물. `verified_with_warning` 이다."""
    return tuple(
        output.output_id
        for output in screening.published
        if disclosure_for(output.verdict).follow_up is FollowUp.SHOW_WARNING
    )


__all__ = [
    "GATE_SCOPE_LEVEL",
    "REASON_BLOCKING_CHECK",
    "REASON_JOB_MISMATCH",
    "REASON_NOT_GATED",
    "REASON_OUTPUT_MISSING",
    "REASON_STATUS_UNKNOWN",
    "REASON_UNKNOWN_VERDICT",
    "REASON_VERSION_MISSING",
    "REQUIRED_OUTPUT_TYPES",
    "ActivationOutcome",
    "ActivationRefusal",
    "ActivationStore",
    "VerificationGate",
    "VersionActivation",
    "refusal_summary",
    "to_candidate",
    "warned_outputs",
]
