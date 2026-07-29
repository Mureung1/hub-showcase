"""공개 정책.

docs/architecture.md 8.1 의 표를 함수로 옮긴다. 판정마다 공개 여부와 후속 동작이
정해져 있고, 그 표가 코드 여러 곳에 흩어지면 화면마다 다른 규칙이 적용된다. 이
모듈이 표의 유일한 자리이며 활성화(`orchestration.activation`)와 조회 계약이 같은
함수를 부른다.

값만 받아 값을 돌려준다. 저장소도 생성 모델도 부르지 않으므로 데이터베이스 없이
규칙만 검사할 수 있다.

공개 여부의 원천은 `contracts.verification.PUBLISHABLE` 이다. 이 모듈은 그 집합에
후속 동작을 붙일 뿐이고, 두 곳이 어긋나면 import 시점에 멈춘다(`_verify_alignment`).
공개 집합을 두 벌 관리하면 한쪽만 고쳤을 때 비공개 판정이 화면에 나간다.

실행 한도에 걸린 산출물은 판정과 별개로 거른다. docs/architecture.md 8.1 의 마지막
문장이 그 규칙이고 `screen_outputs` 가 그것을 판정한다.
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from enum import StrEnum

from careersignal.contracts.run_context import StopReason
from careersignal.contracts.verification import PUBLISHABLE, TypedVerdict


class FollowUp(StrEnum):
    """판정이 부르는 후속 동작. docs/architecture.md 8.1 의 오른쪽 칸이다."""

    NONE = "none"
    """공개하고 더 할 일이 없다."""

    SHOW_WARNING = "show_warning"
    """공개하되 경고를 함께 표시한다."""

    KEEP_ACTIVE = "keep_active"
    """공개하지 않고 기존 활성 버전을 유지한다."""

    DROP_CLAIM = "drop_claim"
    """공개하지 않고 해당 주장을 폐기한다. 다음 실행이 다시 만들지 않는다."""

    OPEN_RESEARCH = "open_research"
    """공개하지 않고 조사 요청을 발행한다(docs/architecture.md 5.1)."""


@dataclass(frozen=True, slots=True)
class Disclosure:
    """판정 하나의 공개 규칙."""

    verdict: TypedVerdict
    disclosed: bool
    """활성 버전에 넣어 사용자에게 보일 후보인가."""

    follow_up: FollowUp
    reason: str
    """왜 그렇게 정했는지. 실패 사유를 구조화해 돌려줄 때 그대로 쓴다."""


_POLICY: dict[TypedVerdict, Disclosure] = {
    TypedVerdict.VERIFIED: Disclosure(
        verdict=TypedVerdict.VERIFIED,
        disclosed=True,
        follow_up=FollowUp.NONE,
        reason="검증을 통과한 공개 후보다",
    ),
    TypedVerdict.VERIFIED_WITH_WARNING: Disclosure(
        verdict=TypedVerdict.VERIFIED_WITH_WARNING,
        disclosed=True,
        follow_up=FollowUp.SHOW_WARNING,
        reason="공개 후보이며 경고를 함께 표시한다",
    ),
    TypedVerdict.INSUFFICIENT_EVIDENCE: Disclosure(
        verdict=TypedVerdict.INSUFFICIENT_EVIDENCE,
        disclosed=False,
        follow_up=FollowUp.KEEP_ACTIVE,
        reason="근거가 부족해 공개하지 않고 기존 활성 버전을 유지한다",
    ),
    TypedVerdict.CONTRADICTED: Disclosure(
        verdict=TypedVerdict.CONTRADICTED,
        disclosed=False,
        follow_up=FollowUp.KEEP_ACTIVE,
        reason="반박 근거가 있어 공개하지 않고 기존 활성 버전을 유지한다",
    ),
    TypedVerdict.POLICY_VIOLATION: Disclosure(
        verdict=TypedVerdict.POLICY_VIOLATION,
        disclosed=False,
        follow_up=FollowUp.DROP_CLAIM,
        reason="자료 정책을 어겨 공개하지 않고 주장을 폐기한다",
    ),
    TypedVerdict.SCHEMA_INVALID: Disclosure(
        verdict=TypedVerdict.SCHEMA_INVALID,
        disclosed=False,
        follow_up=FollowUp.NONE,
        reason="형식이 계약과 달라 공개하지 않는다",
    ),
    TypedVerdict.NEEDS_RESEARCH: Disclosure(
        verdict=TypedVerdict.NEEDS_RESEARCH,
        disclosed=False,
        follow_up=FollowUp.OPEN_RESEARCH,
        reason="자료가 더 필요해 공개하지 않고 조사 요청을 발행한다",
    ),
}


def _verify_alignment() -> None:
    """표가 일곱 판정을 모두 덮고 `PUBLISHABLE` 과 같은 집합을 공개하는지 본다.

    import 시점에 한 번 돈다. 판정을 하나 더하고 이 표를 고치지 않으면 그 판정의
    공개 여부가 정해지지 않은 채 활성화가 돌아가므로, 조회하는 자리가 아니라
    모듈이 실릴 때 멈춘다.
    """
    missing = set(TypedVerdict) - set(_POLICY)
    if missing:
        raise RuntimeError(f"공개 정책이 없는 판정: {sorted(missing)}")
    disclosed = frozenset(v for v, rule in _POLICY.items() if rule.disclosed)
    if disclosed != PUBLISHABLE:
        raise RuntimeError(
            "공개 정책이 contracts.verification.PUBLISHABLE 과 어긋난다: "
            f"{sorted(disclosed)} != {sorted(PUBLISHABLE)}"
        )


_verify_alignment()


def disclosure_for(verdict: TypedVerdict) -> Disclosure:
    """판정 하나의 공개 규칙. 등록되지 않은 판정은 없다."""
    return _POLICY[verdict]


def is_disclosed(verdict: TypedVerdict) -> bool:
    """활성 버전에 넣을 수 있는 판정인가."""
    return _POLICY[verdict].disclosed


def follow_up_for(verdict: TypedVerdict) -> FollowUp:
    """판정이 부르는 후속 동작."""
    return _POLICY[verdict].follow_up


def disclosed_verdicts() -> frozenset[TypedVerdict]:
    """공개 후보가 되는 판정. `PUBLISHABLE` 과 같은 집합이다."""
    return frozenset(v for v, rule in _POLICY.items() if rule.disclosed)


def follow_ups(verdicts: Iterable[TypedVerdict]) -> tuple[FollowUp, ...]:
    """여러 판정의 후속 동작을 처음 나온 차례로 중복 없이 모은다.

    한 버전의 산출물이 여러 판정을 담으므로 오케스트레이터가 할 일도 여럿이다.
    `NONE` 은 할 일이 아니라 할 일 없음이므로 빼고 돌려준다.
    """
    seen: list[FollowUp] = []
    for verdict in verdicts:
        action = _POLICY[verdict].follow_up
        if action is FollowUp.NONE or action in seen:
            continue
        seen.append(action)
    return tuple(seen)


# ------------------------------------------------------------ 실행 한도

LIMIT_STOP_REASONS: frozenset[StopReason] = frozenset(
    {StopReason.BUDGET_EXHAUSTED, StopReason.REPAIR_LIMIT}
)
"""조사를 마치지 못하고 한도에 걸려 끝난 종료 사유.

`budget_exhausted` 는 검색·토큰·도구 한도, `repair_limit` 은 수리 회차 한도다
(docs/agent-design.md 11.3). 두 사유는 슬롯을 채워서가 아니라 더 돌 수 없어서
멈춘 것이므로 그 실행의 산출물은 활성 버전에 넣지 않는다
(docs/architecture.md 8.1).

`frontier_exhausted`·`no_new_evidence` 는 한도가 아니라 자료가 더 없다는 뜻이라
여기 넣지 않는다. 그런 실행의 결과는 판정이 거른다.
"""

REASON_NOT_DISCLOSED = "verdict_not_disclosed"
"""판정이 비공개다."""

REASON_RUN_LIMIT = "run_limit_reached"
"""실행 한도에 걸려 조사를 마치지 못했다."""

REASON_OPEN_RESEARCH = "research_unfinished"
"""아직 열린 조사 요청이 있다."""


@dataclass(frozen=True, slots=True)
class OutputCandidate:
    """활성 버전에 넣을지 판단하는 산출물 하나.

    `analysis_outputs` 한 행과 그 행을 만든 실행의 종료 사유를 함께 담는다
    (docs/erd.md 11.3). 저장소 행을 그대로 받지 않고 값으로 받으므로 이 모듈이
    데이터베이스를 모른다.
    """

    output_id: str
    output_type: str
    scope_level: str
    scope_id: str
    verdict: TypedVerdict
    stop_reason: StopReason | None = None
    open_research_requests: int = 0


@dataclass(frozen=True, slots=True)
class OutputScreening:
    """거른 결과. 남긴 것과 뺀 것을 사유와 함께 갖는다."""

    published: tuple[OutputCandidate, ...]
    excluded: tuple[tuple[str, str], ...]
    """(`output_id`, 사유 코드). 왜 빠졌는지 남겨야 활성화 실패를 설명할 수 있다."""

    @property
    def types(self) -> frozenset[str]:
        """남은 산출물의 종류. 4종이 다 있는지 보는 데 쓴다."""
        return frozenset(o.output_type for o in self.published)

    def excluded_by(self, reason: str) -> tuple[str, ...]:
        return tuple(output_id for output_id, code in self.excluded if code == reason)


def exclusion_reason(candidate: OutputCandidate) -> str | None:
    """이 산출물을 빼는 사유. 넣어도 되면 비운다.

    판정을 먼저 본다. 비공개 판정이면 한도와 무관하게 빠지고, 사유가 하나여야
    활성화가 무엇을 고쳐야 하는지 가리킬 수 있다.
    """
    if not is_disclosed(candidate.verdict):
        return REASON_NOT_DISCLOSED
    if candidate.stop_reason in LIMIT_STOP_REASONS:
        return REASON_RUN_LIMIT
    if candidate.open_research_requests > 0:
        return REASON_OPEN_RESEARCH
    return None


def screen_outputs(candidates: Iterable[OutputCandidate]) -> OutputScreening:
    """산출물을 공개 정책과 실행 한도로 거른다. 차례를 유지한다."""
    published: list[OutputCandidate] = []
    excluded: list[tuple[str, str]] = []
    for candidate in candidates:
        reason = exclusion_reason(candidate)
        if reason is None:
            published.append(candidate)
        else:
            excluded.append((candidate.output_id, reason))
    return OutputScreening(published=tuple(published), excluded=tuple(excluded))


def publishable_outputs(
    candidates: Iterable[OutputCandidate],
) -> tuple[OutputCandidate, ...]:
    """활성 버전에 넣을 산출물만 남긴다.

    비공개 판정과 실행 한도에 걸린 결과를 뺀다. 뺀 사유까지 필요하면
    `screen_outputs` 를 쓴다.
    """
    return screen_outputs(candidates).published


__all__ = [
    "LIMIT_STOP_REASONS",
    "REASON_NOT_DISCLOSED",
    "REASON_OPEN_RESEARCH",
    "REASON_RUN_LIMIT",
    "Disclosure",
    "FollowUp",
    "OutputCandidate",
    "OutputScreening",
    "disclosed_verdicts",
    "disclosure_for",
    "exclusion_reason",
    "follow_up_for",
    "follow_ups",
    "is_disclosed",
    "publishable_outputs",
    "screen_outputs",
]
