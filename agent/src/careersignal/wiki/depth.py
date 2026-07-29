"""깊이 등급의 판정 기준을 만드는 규칙.

정의는 docs/knowledge-schema.md 8.2·8.6 을 따른다. 등급의 구조는 직무와 무관하게
고정하고(`foundation` · `application` · `tradeoff`), 각 등급이 이 역량에서 무엇을
뜻하는지는 직무·기업군·기간의 표본에서 발견한다.

Wiki 는 각 깊이 등급이 무엇을 의미하는지를 저장하고, `capability_depth_profiles` 는
어느 등급이 기대되는지를 저장한다. 이 모듈은 그 프로파일의 `depth_distribution` 과
`expected_depth` 를 받아 등급마다 한 문장씩의 판정 기준을 만든다.

순수 함수만 둔다. 저장소도 생성 모델도 에이전트도 import 하지 않는다. 규칙만 보는
검사가 데이터베이스나 네트워크를 끌어들이지 않게 하려는 것이며, 같은 이유로 지표
집계(`metrics/depth_profile.py`)를 import 하지 않는다. 그 모듈은 저장소를 받아
실행 순서를 정하므로 여기서 부르면 규칙에 저장소가 딸려 온다.
"""

from __future__ import annotations

from collections.abc import Mapping
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field

from careersignal.domain.depth import DepthLevel, rank

DEPTH_ORDER: tuple[DepthLevel, ...] = tuple(sorted(DepthLevel, key=rank))
"""얕은 등급부터의 순서. 순서 자체는 `domain/depth.py` 가 갖는다."""

DEPTH_MEANING: dict[DepthLevel, str] = {
    DepthLevel.FOUNDATION: "개념·용어·기본 작동 원리를 이해한다",
    DepthLevel.APPLICATION: "코드·도구·프로젝트에 적용한다",
    DepthLevel.TRADEOFF: "설계 선택, 트레이드오프, 장애·운영 상황을 설명한다",
}
"""docs/knowledge-schema.md 8.2 의 등급별 의미. 직무와 무관하게 고정한다."""

EXPECTED_DEPTH_TAIL_SHARE = 0.5
"""기대 깊이를 고를 때 쓰는 누적 비율 기준.

`capability_depth_profiles.expected_depth` 는 NOT NULL 이므로 정상 경로에서는 저장된
값을 그대로 받는다. 이 상수는 프로파일이 아직 없어 분포만 주어졌을 때의 되돌림용이며,
집계 파이프라인이 쓰는 기준(`metrics/depth_profile.EXPECTED_DEPTH_TAIL_SHARE`)과 같은
값을 둔다. 두 자리가 갈리면 같은 분포에서 Wiki 와 프로파일이 다른 등급을 가리킨다.
"""

SHARE_DIGITS = 6
"""판정에 적는 비율의 소수 자리. 저장되는 값은 jsonb 이므로 자릿수 제약이 없다."""

SUM_TOLERANCE = 1e-6
"""세 비율의 합이 1 에서 벗어나도 되는 폭.

합은 1 이어야 하지만(docs/metric-spec.md 3.3) 나눗셈의 부동소수 오차까지 실패로
보지 않는다. 이 폭을 넘으면 분포가 덜 저장된 것이므로 문장을 지어내지 않고 멈춘다.
"""

MISSING_LEVELS = "depth_distribution 에 등급 세 개가 모두 있지 않다"
NEGATIVE_SHARE = "depth_distribution 의 비율은 음수일 수 없다"
BROKEN_SUM = "depth_distribution 세 비율의 합이 1 이 아니다"


class Standing(StrEnum):
    """기대 깊이를 기준으로 한 등급의 자리.

    등급은 순서를 갖는 값이므로 기대 깊이 하나만으로 세 등급의 처지가 모두 정해진다.
    아래 등급은 이미 깔려 있어야 하고, 기대 등급이 준비의 기준이며, 위 등급은 기준을
    채운 뒤에 본다.
    """

    ASSUMED = "assumed"
    EXPECTED = "expected"
    STRETCH = "stretch"


_ACTION: dict[Standing, str] = {
    Standing.ASSUMED: "기대 깊이보다 얕아 전제로 갖춘다.",
    Standing.EXPECTED: "이 역량의 기대 깊이다.",
    Standing.STRETCH: "기대 깊이보다 깊어 기대 깊이를 채운 뒤에 둔다.",
}
"""자리마다 붙는 행동 문장. 판정 문장의 가운데 한 마디다."""


class DepthCriterion(BaseModel):
    """등급 하나의 판정 기준.

    `wiki_revisions.depth_criteria` jsonb 에 이 모양 셋이 순서대로 들어간다.
    비율을 문장과 함께 남기므로 판정 하나를 프로파일까지 되짚을 수 있다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    level: DepthLevel
    standing: Standing
    share: float = Field(ge=0.0, le=1.0)
    """이 등급을 대표 등급으로 요구한 비율."""

    tail_share: float = Field(ge=0.0, le=1.0)
    """이 등급 이상을 요구한 비율. 등급이 순서를 가지므로 꼬리로 읽는다."""

    statement: str
    """규칙이 만든 판정 문장. 생성 모델은 이 문장을 근거로 설명을 덧붙인다."""


def shares(distribution: Mapping[str, float]) -> dict[DepthLevel, float]:
    """`depth_distribution` jsonb 를 등급별 비율로 읽는다.

    등급이 하나라도 빠졌거나 합이 1 에서 벗어나면 판정하지 않는다. 덜 저장된 분포로
    문장을 만들면 "공고의 몇 %" 가 실제와 다른 값이 되고, 그 문장이 근거를 갖춘
    판정처럼 저장된다.
    """
    try:
        values = {level: float(distribution[str(level)]) for level in DEPTH_ORDER}
    except KeyError as exc:
        raise ValueError(MISSING_LEVELS) from exc

    if any(value < 0 for value in values.values()):
        raise ValueError(NEGATIVE_SHARE)
    if abs(sum(values.values()) - 1.0) > SUM_TOLERANCE:
        raise ValueError(BROKEN_SUM)
    return values


def tail_share(values: Mapping[DepthLevel, float], level: DepthLevel) -> float:
    """그 등급 이상을 요구한 비율."""
    return sum(
        share for candidate, share in values.items() if rank(candidate) >= rank(level)
    )


def expected_from_shares(values: Mapping[DepthLevel, float]) -> DepthLevel:
    """분포만으로 기대 깊이를 고른다. 프로파일이 아직 없을 때만 쓴다.

    가장 깊은 등급부터 누적 비율을 세어 `EXPECTED_DEPTH_TAIL_SHARE` 에 처음 닿는
    등급이다. `foundation` 의 누적 비율은 언제나 1 이므로 고르지 못하는 경우가 없다.
    """
    for level in reversed(DEPTH_ORDER):
        if tail_share(values, level) >= EXPECTED_DEPTH_TAIL_SHARE:
            return level
    return DEPTH_ORDER[0]


def standing_of(level: DepthLevel, expected: DepthLevel) -> Standing:
    """기대 깊이를 기준으로 이 등급의 자리를 가른다."""
    if rank(level) < rank(expected):
        return Standing.ASSUMED
    if rank(level) == rank(expected):
        return Standing.EXPECTED
    return Standing.STRETCH


def percent(share: float) -> str:
    """비율을 문장에 넣을 백분율 문자열로 옮긴다."""
    return f"{share * 100:.1f}%"


def statement(
    level: DepthLevel, standing: Standing, level_tail_share: float, label: str
) -> str:
    """등급 하나의 판정 문장. 같은 입력에서 같은 문장이 나온다."""
    return (
        f"{label} 의 {level} 등급. {_ACTION[standing]} "
        f"공고의 {percent(level_tail_share)} 가 이 등급 이상을 요구한다. "
        f"기준은 '{DEPTH_MEANING[level]}' 이다."
    )


def depth_criteria(
    distribution: Mapping[str, float],
    label: str,
    expected_depth: DepthLevel | str | None = None,
) -> tuple[DepthCriterion, ...]:
    """분포 하나에서 등급 셋의 판정 기준을 만든다. 순서는 얕은 등급부터다.

    `expected_depth` 는 `capability_depth_profiles` 의 값을 그대로 넘긴다. 비어 있으면
    분포에서 다시 고르며, 그때도 집계 파이프라인과 같은 기준을 쓴다.
    """
    values = shares(distribution)
    expected = (
        DepthLevel(expected_depth)
        if expected_depth is not None
        else expected_from_shares(values)
    )

    criteria: list[DepthCriterion] = []
    for level in DEPTH_ORDER:
        standing = standing_of(level, expected)
        tail = tail_share(values, level)
        criteria.append(
            DepthCriterion(
                level=level,
                standing=standing,
                share=round(values[level], SHARE_DIGITS),
                tail_share=round(tail, SHARE_DIGITS),
                statement=statement(level, standing, tail, label),
            )
        )
    return tuple(criteria)


__all__ = [
    "BROKEN_SUM",
    "DEPTH_MEANING",
    "DEPTH_ORDER",
    "EXPECTED_DEPTH_TAIL_SHARE",
    "MISSING_LEVELS",
    "NEGATIVE_SHARE",
    "SHARE_DIGITS",
    "SUM_TOLERANCE",
    "DepthCriterion",
    "Standing",
    "depth_criteria",
    "expected_from_shares",
    "percent",
    "shares",
    "standing_of",
    "statement",
    "tail_share",
]
