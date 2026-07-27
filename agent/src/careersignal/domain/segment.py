"""대상군.

정의는 docs/metric-spec.md 2.6과 docs/statistics-model.md 5장을 따른다.
저장소와 생성 모델을 import 하지 않는다.

대상군은 지표의 그룹 축이다. 같은 직무·기업군·기간이라도 신입·주니어에게
요구하는 수준과 경력에게 요구하는 수준이 다르므로 한 기준선에 섞지 않는다.

`posting_versions.entry_label` 은 공고 하나의 표기이고, 대상군은 집계 축이다.
표기 다섯 값을 축 세 값으로 접는다.
"""

from __future__ import annotations

from enum import StrEnum


class EntryLabel(StrEnum):
    """`posting_versions.entry_label` 의 값 집합."""

    ENTRY = "entry"
    JUNIOR = "junior"
    ENTRY_JUNIOR = "entry_junior"
    EXPERIENCED = "experienced"
    UNSPECIFIED = "unspecified"


class EntrySegment(StrEnum):
    """지표의 대상군 축.

    `unspecified` 를 신입·주니어에 합치지 않는다. 표기가 없는 공고를 신입 기준선에
    넣으면 기준선이 실제보다 높아진다.
    """

    ENTRY_JUNIOR = "entry_junior"
    EXPERIENCED = "experienced"
    UNSPECIFIED = "unspecified"


_LABEL_TO_SEGMENT: dict[EntryLabel, EntrySegment] = {
    EntryLabel.ENTRY: EntrySegment.ENTRY_JUNIOR,
    EntryLabel.JUNIOR: EntrySegment.ENTRY_JUNIOR,
    EntryLabel.ENTRY_JUNIOR: EntrySegment.ENTRY_JUNIOR,
    EntryLabel.EXPERIENCED: EntrySegment.EXPERIENCED,
    EntryLabel.UNSPECIFIED: EntrySegment.UNSPECIFIED,
}

PRIMARY_SEGMENT: EntrySegment = EntrySegment.ENTRY_JUNIOR
"""제품의 주 대상군. 표시 순서의 기준이며 다른 대상군을 배제하지 않는다.

표본이 충분한 대상군은 함께 표시한다. 신입·주니어 기준선만 보면 지금 무엇을
준비할지는 알아도 어디로 가는지는 알 수 없다.
"""

SEGMENT_ONLY_FAMILIES: frozenset[str] = frozenset(
    {"entry_label_advanced_signal_rate"}
)
"""신입·주니어 대상군에서만 계산하는 지표.

이 지표의 분모가 이미 신입·주니어 표시 공고이므로 다른 대상군에서는 정의되지 않는다.
"""


def segment_of(label: EntryLabel) -> EntrySegment:
    return _LABEL_TO_SEGMENT[label]


def applicable(metric_family: str, segment: EntrySegment) -> bool:
    """대상군에서 이 지표를 계산할 수 있는가."""
    if metric_family in SEGMENT_ONLY_FAMILIES:
        return segment is EntrySegment.ENTRY_JUNIOR
    return True
