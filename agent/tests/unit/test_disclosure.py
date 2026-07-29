"""공개 정책 검증.

규칙은 docs/architecture.md 8.1 에서 온다. 순수 함수만 부르므로 저장소도 모델도
쓰지 않는다.
"""

from __future__ import annotations

import pytest

from careersignal.contracts.run_context import StopReason
from careersignal.contracts.verification import PUBLISHABLE, TypedVerdict
from careersignal.orchestration.disclosure import (
    LIMIT_STOP_REASONS,
    REASON_NOT_DISCLOSED,
    REASON_OPEN_RESEARCH,
    REASON_RUN_LIMIT,
    FollowUp,
    OutputCandidate,
    disclosed_verdicts,
    disclosure_for,
    exclusion_reason,
    follow_up_for,
    follow_ups,
    is_disclosed,
    publishable_outputs,
    screen_outputs,
)


def _output(
    output_id: str = "out_demo_backend_stat_overall",
    output_type: str = "statistics",
    verdict: TypedVerdict = TypedVerdict.VERIFIED,
    stop_reason: StopReason | None = StopReason.SLOTS_FILLED,
    open_research_requests: int = 0,
    scope_level: str = "overall",
) -> OutputCandidate:
    return OutputCandidate(
        output_id=output_id,
        output_type=output_type,
        scope_level=scope_level,
        scope_id="backend",
        verdict=verdict,
        stop_reason=stop_reason,
        open_research_requests=open_research_requests,
    )


# ------------------------------------------------------------ 8.1 표

EXPECTED = {
    TypedVerdict.VERIFIED: (True, FollowUp.NONE),
    TypedVerdict.VERIFIED_WITH_WARNING: (True, FollowUp.SHOW_WARNING),
    TypedVerdict.INSUFFICIENT_EVIDENCE: (False, FollowUp.KEEP_ACTIVE),
    TypedVerdict.CONTRADICTED: (False, FollowUp.KEEP_ACTIVE),
    TypedVerdict.POLICY_VIOLATION: (False, FollowUp.DROP_CLAIM),
    TypedVerdict.SCHEMA_INVALID: (False, FollowUp.NONE),
    TypedVerdict.NEEDS_RESEARCH: (False, FollowUp.OPEN_RESEARCH),
}


@pytest.mark.parametrize(("verdict", "expected"), sorted(EXPECTED.items()))
def test_policy_matches_architecture_table(
    verdict: TypedVerdict, expected: tuple[bool, FollowUp]
) -> None:
    """일곱 판정의 공개 여부와 후속 동작이 8.1 표와 같다."""
    rule = disclosure_for(verdict)
    assert (rule.disclosed, rule.follow_up) == expected
    assert is_disclosed(verdict) is expected[0]
    assert follow_up_for(verdict) is expected[1]
    assert rule.reason


def test_every_verdict_has_a_rule() -> None:
    """판정을 더하고 표를 고치지 않으면 공개 여부가 정해지지 않는다."""
    assert set(EXPECTED) == set(TypedVerdict)
    for verdict in TypedVerdict:
        assert disclosure_for(verdict).verdict is verdict


def test_disclosed_set_equals_publishable() -> None:
    """공개 집합이 `contracts.verification.PUBLISHABLE` 과 어긋나지 않는다."""
    assert disclosed_verdicts() == PUBLISHABLE


def test_follow_ups_dedupe_and_drop_none() -> None:
    """할 일 없음은 빼고 나머지는 처음 나온 차례로 한 번씩 나온다."""
    assert follow_ups(
        [
            TypedVerdict.VERIFIED,
            TypedVerdict.NEEDS_RESEARCH,
            TypedVerdict.VERIFIED_WITH_WARNING,
            TypedVerdict.NEEDS_RESEARCH,
        ]
    ) == (FollowUp.OPEN_RESEARCH, FollowUp.SHOW_WARNING)


# ------------------------------------------------------------ 산출물 거르기


def test_publishable_outputs_keeps_verified_and_warned() -> None:
    """공개 후보 두 판정만 남는다."""
    kept = publishable_outputs(
        [
            _output(output_id="out_a", verdict=TypedVerdict.VERIFIED),
            _output(output_id="out_b", verdict=TypedVerdict.VERIFIED_WITH_WARNING),
            _output(output_id="out_c", verdict=TypedVerdict.CONTRADICTED),
            _output(output_id="out_d", verdict=TypedVerdict.NEEDS_RESEARCH),
        ]
    )
    assert [o.output_id for o in kept] == ["out_a", "out_b"]


@pytest.mark.parametrize("stop_reason", sorted(LIMIT_STOP_REASONS))
def test_limit_reached_output_is_excluded(stop_reason: StopReason) -> None:
    """검증을 통과했어도 한도에 걸려 끝난 실행의 결과는 활성 버전에 넣지 않는다."""
    candidate = _output(output_id="out_limit", stop_reason=stop_reason)
    assert exclusion_reason(candidate) == REASON_RUN_LIMIT
    assert publishable_outputs([candidate]) == ()


def test_open_research_request_excludes_output() -> None:
    """조사 요청이 열려 있으면 조사를 마치지 못한 결과다."""
    candidate = _output(output_id="out_open", open_research_requests=1)
    assert exclusion_reason(candidate) == REASON_OPEN_RESEARCH
    assert publishable_outputs([candidate]) == ()


def test_evidence_exhaustion_is_not_a_limit() -> None:
    """자료가 더 없어 끝난 실행은 한도에 걸린 것이 아니다."""
    for stop_reason in (StopReason.NO_NEW_EVIDENCE, StopReason.FRONTIER_EXHAUSTED):
        assert exclusion_reason(_output(stop_reason=stop_reason)) is None


def test_verdict_is_checked_before_limit() -> None:
    """사유는 하나다. 비공개 판정이면 한도를 보지 않는다."""
    candidate = _output(
        verdict=TypedVerdict.SCHEMA_INVALID, stop_reason=StopReason.BUDGET_EXHAUSTED
    )
    assert exclusion_reason(candidate) == REASON_NOT_DISCLOSED


def test_screen_outputs_records_reasons_and_types() -> None:
    """뺀 산출물의 사유와 남은 종류를 함께 돌려준다."""
    screening = screen_outputs(
        [
            _output(output_id="out_stat", output_type="statistics"),
            _output(
                output_id="out_road",
                output_type="roadmap",
                verdict=TypedVerdict.INSUFFICIENT_EVIDENCE,
            ),
            _output(
                output_id="out_strat",
                output_type="strategy",
                stop_reason=StopReason.REPAIR_LIMIT,
            ),
        ]
    )
    assert [o.output_id for o in screening.published] == ["out_stat"]
    assert screening.types == {"statistics"}
    assert screening.excluded == (
        ("out_road", REASON_NOT_DISCLOSED),
        ("out_strat", REASON_RUN_LIMIT),
    )
    assert screening.excluded_by(REASON_RUN_LIMIT) == ("out_strat",)


def test_unknown_stop_reason_absence_does_not_exclude() -> None:
    """종료 사유를 모르면 한도 판단을 하지 않는다."""
    assert exclusion_reason(_output(stop_reason=None)) is None
