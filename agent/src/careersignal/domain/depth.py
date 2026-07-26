"""역량 깊이 등급.

정의는 docs/knowledge-schema.md 8.2를 따른다.
등급의 구조는 직무와 무관하게 고정하고, 판정 기준 문장은 직무별로 발견한다.
저장소와 생성 모델을 import 하지 않는다.
"""

from __future__ import annotations

from enum import StrEnum


class DepthLevel(StrEnum):
    FOUNDATION = "foundation"
    APPLICATION = "application"
    TRADEOFF = "tradeoff"


_ORDER: dict[DepthLevel, int] = {
    DepthLevel.FOUNDATION: 0,
    DepthLevel.APPLICATION: 1,
    DepthLevel.TRADEOFF: 2,
}

ADVANCED_SIGNAL_LEVEL = DepthLevel.TRADEOFF
"""`entry_label_advanced_signal_rate` 의 심화 신호 판정 기준."""


def rank(level: DepthLevel) -> int:
    return _ORDER[level]


def is_deeper(level: DepthLevel, than: DepthLevel) -> bool:
    return _ORDER[level] > _ORDER[than]


def is_advanced_signal(level: DepthLevel) -> bool:
    return level is ADVANCED_SIGNAL_LEVEL


def highest(levels: list[DepthLevel]) -> DepthLevel | None:
    return max(levels, key=rank) if levels else None
