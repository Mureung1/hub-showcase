"""요구 차원 생명주기 전이 검증.

순서는 docs/statistics-model.md 3.3, 값 집합은 docs/erd.md 7.4 에서 온다. 순수
함수만 검사하며 저장소에 붙지 않는다.
"""

from __future__ import annotations

import pytest

from careersignal.taxonomy import lifecycle


# ============================================================ 값 집합
def test_the_statuses_match_the_check() -> None:
    assert set(lifecycle.LIFECYCLE_STATUSES) == {
        "proposed",
        "collecting_evidence",
        "under_review",
        "approved",
        "active",
        "merged",
        "split",
        "deprecated",
    }


def test_the_promotion_chain_follows_the_documented_order() -> None:
    assert lifecycle.PROMOTION_CHAIN == (
        "proposed",
        "collecting_evidence",
        "under_review",
        "approved",
        "active",
    )


def test_the_terminal_statuses_have_no_way_out() -> None:
    for status in lifecycle.TERMINAL_STATUSES:
        assert lifecycle.is_terminal(status)
        with pytest.raises(ValueError):
            lifecycle.require_transition(status, lifecycle.ACTIVE)


# ============================================================ 한 걸음 전이
@pytest.mark.parametrize(
    ("current", "target"),
    [
        ("proposed", "collecting_evidence"),
        ("collecting_evidence", "under_review"),
        ("under_review", "approved"),
        ("approved", "active"),
        ("active", "deprecated"),
        ("active", "merged"),
        ("active", "split"),
    ],
)
def test_the_documented_order_is_allowed(current: str, target: str) -> None:
    assert lifecycle.can_transition(current, target)


@pytest.mark.parametrize(
    ("current", "target"),
    [
        ("proposed", "active"),
        ("proposed", "approved"),
        ("collecting_evidence", "active"),
        ("under_review", "active"),
        ("active", "proposed"),
        ("approved", "under_review"),
        ("deprecated", "active"),
        ("merged", "split"),
    ],
)
def test_a_skipped_or_reversed_transition_is_refused(current: str, target: str) -> None:
    """CHECK 는 값의 집합만 강제한다. 차례를 지키는 것은 이 함수의 몫이다."""
    assert not lifecycle.can_transition(current, target)
    with pytest.raises(ValueError):
        lifecycle.require_transition(current, target)


def test_an_unknown_status_is_refused() -> None:
    with pytest.raises(ValueError):
        lifecycle.require_transition("published", "active")


# ============================================================ 경로
def test_the_promotion_path_walks_every_step() -> None:
    """`proposed` 에서 `active` 까지 건너뛰는 자리가 없다."""
    assert lifecycle.path_to("proposed", "active") == (
        "collecting_evidence",
        "under_review",
        "approved",
        "active",
    )


def test_the_same_status_needs_no_step() -> None:
    assert lifecycle.path_to("collecting_evidence", "collecting_evidence") == ()


def test_a_rejected_candidate_reaches_deprecated_through_review() -> None:
    assert lifecycle.path_to("proposed", "deprecated") == (
        "collecting_evidence",
        "under_review",
        "deprecated",
    )


def test_a_merged_candidate_reaches_merged_through_review() -> None:
    assert lifecycle.path_to("proposed", "merged") == (
        "collecting_evidence",
        "under_review",
        "merged",
    )


def test_an_unreachable_target_raises() -> None:
    with pytest.raises(ValueError):
        lifecycle.path_to("deprecated", "active")


def test_reachability_answers_without_raising() -> None:
    assert lifecycle.reachable("proposed", "active")
    assert not lifecycle.reachable("merged", "active")
