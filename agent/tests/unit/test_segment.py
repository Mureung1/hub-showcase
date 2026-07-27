"""대상군 축 검증.

정의는 docs/metric-spec.md 2.7과 docs/statistics-model.md 5.3에서 온다.
"""

from __future__ import annotations

import pytest

from careersignal.domain.segment import (
    PRIMARY_SEGMENT,
    SEGMENT_ONLY_FAMILIES,
    EntryLabel,
    EntrySegment,
    applicable,
    segment_of,
)


def test_entry_labels_match_the_database_check() -> None:
    assert {str(v) for v in EntryLabel} == {
        "entry",
        "junior",
        "entry_junior",
        "experienced",
        "unspecified",
    }


def test_every_label_maps_to_a_segment() -> None:
    """대응이 빠진 표기가 있으면 그 공고가 어느 기준선에도 안 들어간다."""
    for label in EntryLabel:
        assert isinstance(segment_of(label), EntrySegment)


@pytest.mark.parametrize(
    "label",
    [EntryLabel.ENTRY, EntryLabel.JUNIOR, EntryLabel.ENTRY_JUNIOR],
)
def test_entry_and_junior_share_one_segment(label: EntryLabel) -> None:
    assert segment_of(label) is EntrySegment.ENTRY_JUNIOR


def test_unspecified_is_not_folded_into_entry_junior() -> None:
    """표기 없는 공고를 신입 기준선에 넣으면 기준선이 실제보다 높아진다."""
    assert segment_of(EntryLabel.UNSPECIFIED) is EntrySegment.UNSPECIFIED
    assert segment_of(EntryLabel.UNSPECIFIED) is not EntrySegment.ENTRY_JUNIOR


def test_experienced_is_its_own_segment() -> None:
    assert segment_of(EntryLabel.EXPERIENCED) is EntrySegment.EXPERIENCED


def test_primary_segment_is_entry_junior() -> None:
    """제품이 기준선으로 삼는 대상군."""
    assert PRIMARY_SEGMENT is EntrySegment.ENTRY_JUNIOR


# ============================================================ 적용 가능성
def test_general_metrics_apply_to_every_segment() -> None:
    for segment in EntrySegment:
        assert applicable("posting_prevalence", segment) is True


def test_signal_rate_applies_only_to_entry_junior() -> None:
    """분모가 이미 신입·주니어 표시 공고인 지표는 다른 대상군에서 정의되지 않는다."""
    assert applicable("entry_label_advanced_signal_rate", EntrySegment.ENTRY_JUNIOR)
    assert not applicable(
        "entry_label_advanced_signal_rate", EntrySegment.EXPERIENCED
    )
    assert not applicable(
        "entry_label_advanced_signal_rate", EntrySegment.UNSPECIFIED
    )


def test_segment_only_families_are_declared() -> None:
    assert SEGMENT_ONLY_FAMILIES == frozenset({"entry_label_advanced_signal_rate"})
