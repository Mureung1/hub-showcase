"""요구 표현의 깊이 등급 판정.

등급 세 값과 그 뜻은 docs/knowledge-schema.md 8.2 가 정의하고, 값 객체는
`careersignal.domain.depth.DepthLevel` 이다. 이 모듈은 그 정의를 표현 원문에
적용해 `posting_requirement_assignments.depth_level` 을 정한다(docs/erd.md 7.13).

| 등급 | 정의(docs/knowledge-schema.md 8.2) |
| --- | --- |
| `foundation` | 개념·용어·기본 작동 원리를 이해한다 |
| `application` | 코드·도구·프로젝트에 적용한다 |
| `tradeoff` | 설계 선택, 트레이드오프, 장애·운영 상황을 설명한다 |

판정은 표현 원문의 신호 낱말로 한다. 평가 세트가 `depth_signal` 에 등급을 결정한
원문 신호를 적고 그 신호에서 `depth_level` 을 유도하므로(docs/eval/README.md 의
차원 세트 `expected_value` 표), 코드도 같은 자리에서 같은 방식으로 판정한다.

신호가 여럿이면 가장 깊은 등급을 쓴다. 근거는 docs/metric-spec.md 3.3 의 대표 등급
규칙(`foundation < application < tradeoff`)이며, 가장 깊은 요구에 맞추면 아래 등급은
따라온다. 순서 비교는 `domain/depth.py` 의 `highest` 를 그대로 쓴다.

연차·기간은 신호가 아니다. docs/eval/rubrics_v1.json 의 `rb_depth_level_grade` 가
자격·연차를 `foundation` 으로 적고 `signal_map` 이 `attribute` 를 그 등급에
대응시킨다. 연차 표기가 있는 표현에서는 연차를 세는 말(`TENURE_ATTENDANT_SIGNALS`)을
신호에서 빼며, 그 결과 남는 신호가 없으면 `foundation` 이다.

신호가 하나도 없으면 `foundation` 이다. 컬럼이 NOT NULL 이고 `unknown` 이 없으므로
(docs/erd.md 7.13) 등급을 반드시 하나 골라야 하고, 셋 가운데 가장 적게 주장하는 값을
고른다. 신호 없는 표현을 `tradeoff` 로 올리면 `entry_label_advanced_signal_rate` 의
분자가 부풀고(docs/statistics-model.md 5.7), `application` 으로 올리면
`depth_distribution` 의 중간 등급이 부푼다.

순수 함수다. 저장소와 생성 모델을 import 하지 않는다.
"""

from __future__ import annotations

import re

from careersignal.domain.depth import DepthLevel, highest
from careersignal.taxonomy.vocabulary import normalize_expression

DEFAULT_LEVEL = DepthLevel.FOUNDATION
"""신호가 없을 때의 등급. 셋 가운데 가장 적게 주장하는 값이다."""

FOUNDATION_SIGNALS: tuple[str, ...] = (
    "이해",
    "개념",
    "기본",
    "원리",
    "지식",
    "학습",
    "관심",
    "숙지",
    "이론",
    "알고 있",
    "basic",
    "understanding",
    "knowledge",
    "familiar",
)
"""`foundation` 신호. 개념·용어·기본 작동 원리를 가리키는 낱말이다."""

APPLICATION_SIGNALS: tuple[str, ...] = (
    "경험",
    "개발",
    "구현",
    "구축",
    "활용",
    "적용",
    "사용",
    "작성",
    "운영",
    "프로젝트",
    "실무",
    "능숙",
    "다룰 수 있",
    "experience",
    "hands-on",
    "development",
)
"""`application` 신호. 코드·도구·프로젝트에 적용한 자취를 가리키는 낱말이다.

`운영` 은 docs/eval/rubrics_v1.json 의 `rb_depth_level_grade` 가
"언어·도구·프레임워크의 사용이나 구현·운영 경험을 요구하면 application 이다" 로 적은
것을 따른다. 운영 안정화처럼 등급을 올리는 자리는 `TRADEOFF_SIGNALS` 가 따로 잡고,
신호가 겹치면 가장 깊은 등급이 이긴다.
"""

TRADEOFF_SIGNALS: tuple[str, ...] = (
    "대용량",
    "대규모",
    "실시간",
    "트래픽",
    "동시성",
    "동시 요청",
    "동시 접속",
    "병목",
    "장애",
    "부하",
    "성능 개선",
    "성능 최적화",
    "튜닝",
    "확장성",
    "고가용성",
    "무중단",
    "정합성",
    "트레이드오프",
    "설계 경험",
    "아키텍처 설계",
    "시스템 설계",
    "시스템 구조",
    "구조 설계",
    "재설계",
    "scalability",
    "high availability",
    "bottleneck",
    "trade-off",
)
"""`tradeoff` 신호.

설계 선택과 장애·운영 상황을 가리키는 낱말이다. 앞의 셋(`대용량`, `동시성`,
`장애`)은 docs/statistics-model.md 5.7 이 심화 신호의 예로 든 것이다.

`실시간` 은 docs/eval/rubrics_v1.json 의 `rb_depth_level_grade` 가 규모 신호로
"대용량, 대규모, 실시간, 고가용성" 넷을 적은 것을 따른다. 넷 가운데 `실시간` 만
빠져 있었다.

`시스템 구조` 와 `재설계` 는 같은 루브릭의 "표현이 시스템 구조의 선택이나 재설계를
명시하면 tradeoff 다" 를 따른다. `구조 설계` 만 두면 `시스템 구조 및 아키텍처를
설계` 처럼 두 말 사이에 다른 낱말이 끼는 표기를 놓친다.

`분산 처리` 를 신호에서 뺀다. 같은 루브릭이 든 tradeoff 신호는 규모·동시성·장애·구조
선택 넷이고 분산 처리는 그 가운데 어느 것도 아니다. 분산 처리는 깊이가 아니라
docs/eval/backend_dimensions_v1.json 의 차원 라벨 `분산 시스템과 마이크로서비스` 가
가리키는 주제이며, 주제를 깊이 신호로 쓰면 `분산 처리 시스템 ... 에 대한 이해도가
높으신 분`(기대 등급 `foundation`)이 tradeoff 로 올라간다. 루브릭의 `fail_when` 이
"규모·동시성·장애 신호가 원문에 없는데 직무 통념으로 tradeoff 를 부여하면 오답이다"
로 막는 자리다.

`설계` 한 낱말을 신호로 두지 않는다. 설계라는 말은 적용 수준의 표현에도 붙으며,
등급을 올리는 것은 선택과 트레이드오프를 요구하는 자리다. 같은 루브릭의 `fail_when`
이 "기능 흐름의 설계를 구조 선택으로 읽어 tradeoff 를 부여하면 오답이다" 로 적는다.
"""


TENURE_PATTERNS: tuple[str, ...] = (
    r"\d+년(?:이상|이하|초과|미만)",
    r"\d+년차",
    r"경력\d+년",
    r"\d+년경력",
)
"""연차·기간을 요구하는 표기.

매칭 키에 대고 견주므로 띄어쓰기를 적지 않는다. `normalize_expression` 이 공백을
모두 지우므로 `3년 이상` 과 `3년이상` 이 같은 키가 된다.

이 표기를 따로 두는 근거는 docs/eval/rubrics_v1.json 의 `rb_depth_level_grade` 다.
`pass_when` 이 "표현이 자격·연차·태도·학위·어학을 요구하면 foundation 이다" 로
적고 `signal_map` 이 `attribute` 를 `foundation` 에 대응시킨다. 연차는 무엇을 할 수
있는지가 아니라 얼마나 오래 했는지를 재는 값이며, 깊이 등급이 재는 것과 다르다.
"""

TENURE_ATTENDANT_SIGNALS: tuple[str, ...] = (
    "경험",
    "경력",
    "개발",
    "실무",
)
"""연차 표기에 딸려 오는 낱말. 연차가 함께 있으면 깊이 신호로 세지 않는다.

`3년 이상의 백엔드 개발 경험` 은 docs/eval/backend_dimensions_v1.json 이
`depth_signal` 을 `attribute`, `depth_level` 을 `foundation` 으로 적은 표현이고
차원 라벨도 `경력 연차` 다. 그런데 `경험` 과 `개발` 이 `APPLICATION_SIGNALS` 에
있어 등급이 `application` 으로 올라갔다.

네 낱말은 연차를 세는 말의 일부다. 연차 요구는 `N년 이상의 <분야> 개발 경험`
처럼 적히며, 여기의 `개발 경험` 은 무엇을 다뤄 봤는지가 아니라 무엇을 세는지를
가리킨다. 그래서 연차 표기가 함께 있을 때만 이 넷을 신호에서 뺀다. 연차가 없는
`Golang을 활용한 프로덕션 서비스 개발 및 운영 경험` 은 그대로 `application` 이다.

넷 밖의 신호는 빼지 않는다. `5년 이상 대용량 트래픽 처리 경험` 은 `대용량` 이
남아 `tradeoff` 이고, `경력 3년 이상, Kafka 운영 경험` 은 `운영` 이 남아
`application` 이다. 같은 루브릭이 규모 신호를 `tradeoff` 로, 운영 경험을
`application` 으로 적는 것과 맞는다.
"""

_TENURE = re.compile("|".join(TENURE_PATTERNS))
"""연차 표기를 한 번에 견주는 규칙."""


def _keys(signals: tuple[str, ...]) -> tuple[str, ...]:
    """신호를 매칭 키로 옮긴다. 표현과 신호가 같은 규칙을 지난다."""
    return tuple(key for key in (normalize_expression(s) for s in signals) if key)


_SIGNALS: tuple[tuple[DepthLevel, tuple[str, ...]], ...] = (
    (DepthLevel.FOUNDATION, _keys(FOUNDATION_SIGNALS)),
    (DepthLevel.APPLICATION, _keys(APPLICATION_SIGNALS)),
    (DepthLevel.TRADEOFF, _keys(TRADEOFF_SIGNALS)),
)
"""등급과 그 등급의 매칭 키. 순서는 판정에 영향을 주지 않는다."""

_TENURE_ATTENDANT_KEYS: frozenset[str] = frozenset(_keys(TENURE_ATTENDANT_SIGNALS))
"""연차 표기가 함께 있을 때 신호에서 빼는 매칭 키."""


def states_tenure(expression: str | None) -> bool:
    """표현이 연차·기간을 요구하는가.

    `N년 이상`, `N년차`, `경력 N년` 과 그 표기 변형을 잡는다. 연차는 깊이가 아니라
    자격이므로 이 판정이 참이면 딸림 낱말을 신호에서 뺀다.
    """
    key = normalize_expression(expression or "")
    return bool(key) and _TENURE.search(key) is not None


def _ignored(key: str) -> frozenset[str]:
    """이 표현에서 신호로 세지 않을 매칭 키. 연차가 없으면 빈다."""
    if _TENURE.search(key) is None:
        return frozenset()
    return _TENURE_ATTENDANT_KEYS


def matched_signals(expression: str) -> tuple[str, ...]:
    """표현이 건드린 신호 키 전부. 판정의 근거이며 진단에 쓴다.

    `judge_depth` 가 세지 않은 키는 여기에도 담지 않는다. 근거와 판정이 어긋나면
    진단이 판정을 설명하지 못한다.
    """
    key = normalize_expression(expression)
    if not key:
        return ()
    ignored = _ignored(key)
    return tuple(
        signal
        for _, signals in _SIGNALS
        for signal in signals
        if signal in key and signal not in ignored
    )


def judge_depth(expression: str | None) -> DepthLevel:
    """요구 표현 하나의 깊이 등급.

    표현에 걸린 신호의 등급 가운데 가장 깊은 것을 돌려주고, 걸린 신호가 없으면
    `DEFAULT_LEVEL` 이다.

    연차·기간을 요구하는 표현은 `TENURE_ATTENDANT_SIGNALS` 를 빼고 견준다. 연차만
    남는 표현은 걸린 신호가 없어 `foundation` 이 된다.
    """
    key = normalize_expression(expression or "")
    if not key:
        return DEFAULT_LEVEL

    ignored = _ignored(key)
    found = [
        level
        for level, signals in _SIGNALS
        if any(signal in key for signal in signals if signal not in ignored)
    ]
    return highest(found) or DEFAULT_LEVEL


__all__ = [
    "APPLICATION_SIGNALS",
    "DEFAULT_LEVEL",
    "FOUNDATION_SIGNALS",
    "TENURE_ATTENDANT_SIGNALS",
    "TENURE_PATTERNS",
    "TRADEOFF_SIGNALS",
    "judge_depth",
    "matched_signals",
    "states_tenure",
]
