"""공고 라벨 원문의 필수·우대 정규화.

`requirement_mentions.stated_requiredness` 는 공고가 쓴 구간 라벨 원문이고 열거값이
아니다(docs/erd.md 6.1). 이 모듈은 그 원문을
`posting_requirement_assignments.requiredness` 의 네 열거값으로 옮긴다. 근거는
docs/erd.md 7.13 의 "`requiredness` 는 `requirement_mentions.stated_requiredness` 의
원문 표현을 열거값으로 정규화한 결과다" 이며, 원문은 mention 에 남고 해석 결과만
할당에 담긴다(docs/adr/0005-mention-assignment-separation.md).

순수 함수다. 저장소와 생성 모델을 import 하지 않는다. 문자열 하나를 받아 열거값
하나를 돌려줄 뿐이다.

대조는 표지 문자열의 포함 관계로 한다. 구간 라벨은 짧고 표기 습관만 흔들리므로
(`자격 요건`·`자격요건`, `우대 사항`·`우대사항`) 어휘 매칭 키를 그대로 쓴다.
정규화 함수는 `careersignal.taxonomy.vocabulary.normalize_expression` 이며, 같은
규칙을 두 벌 두지 않는다.

판단할 수 없으면 `unknown` 이다. 표지가 하나도 없는 라벨과 서로 다른 갈래의 표지가
함께 있는 라벨이 여기에 해당한다. `자격요건 및 우대사항` 처럼 두 갈래가 한 라벨에
있으면 어느 쪽인지 정할 근거가 없고, 임의로 `required` 로 밀면
`requiredness_ratio` 의 분자가 조용히 부푼다(docs/metric-spec.md 3.2).
"""

from __future__ import annotations

from enum import StrEnum

from careersignal.taxonomy.vocabulary import normalize_expression


class Requiredness(StrEnum):
    """`posting_requirement_assignments.requiredness` 의 CHECK 와 같은 집합이다."""

    REQUIRED = "required"
    PREFERRED = "preferred"
    RESPONSIBILITY = "responsibility"
    UNKNOWN = "unknown"


REQUIREDNESS: tuple[str, ...] = tuple(value for value in Requiredness)
"""네 열거값. docs/erd.md 7.13 의 CHECK 집합이다."""

REQUIRED_MARKERS: tuple[str, ...] = (
    "자격요건",
    "지원자격",
    "필수",
    "필요역량",
    "필요조건",
    "기본자격",
    "이런 분을 찾",
    "이런 분과 함께",
    "requirements",
    "qualifications",
    "must have",
    "what we look for",
)
"""`required` 로 읽는 라벨 표지.

한국어 공고의 필수 구간은 `자격요건`·`지원자격`·`필수사항` 계열이거나 `이런 분을
찾습니다` 처럼 사람을 부르는 문장이다. 뒤엣말은 어미가 흔들리므로(`찾습니다`·`찾아요`)
표지를 어간까지만 둔다.

`이런 분이면` 을 표지에서 뺀다. docs/eval/backend_v1.json 의 실제 라벨
`이런 분이면 더 좋아요` 는 기대값이 `preferred` 이며, 이 표지를 두면 우대 구간이
`required` 로 뒤집힌다. `이런 분이면` 뒤에는 필수(`~한 분을 찾아요`)와
우대(`~면 더 좋아요`)가 모두 오므로 갈래를 정하지 못하고, 갈래를 정하는 것은 뒤에
붙는 `더 좋` 쪽이다.
"""

PREFERRED_MARKERS: tuple[str, ...] = (
    "우대",
    "선호",
    "가산",
    "이런 경험이 있",
    "이런 경험을 가",
    "있으면 좋",
    "있다면 더 좋",
    "더 좋",
    "더욱 좋",
    "preferred",
    "nice to have",
    "good to have",
    "bonus",
)
"""`preferred` 로 읽는 라벨 표지.

`우대사항`·`우대`가 대표 표기이고, `이런 경험이 있다면`·`있으면 좋아요` 계열이 같은
자리를 대신한다. 필수와 우대를 가르는 것이 `requiredness_ratio` 의 분자를 정하므로
(docs/metric-spec.md 3.2) 두 갈래를 섞지 않는다.

`선호` 를 표지에 넣는다. docs/eval/backend_v1.json 이 담은 실제 라벨
`선호 역량/경험` 의 기대값이 `preferred` 다. `우대` 와 뜻이 같은 말이며 필수 구간에
쓰이지 않는다.

`더 좋`·`더욱 좋` 을 표지에 넣는다. 같은 파일의 `이런 분이면 더 좋아요`,
`이런 점이 있으면 더 좋아요` 처럼 앞말이 `경험`·`분`·`점` 으로 갈리고 뒤의
`더 좋아요` 만 고정되는 라벨이 있다. 갈래를 나르는 말이 뒤에 있으므로 표지도 뒤에
둔다.
"""

RESPONSIBILITY_MARKERS: tuple[str, ...] = (
    "주요업무",
    "담당업무",
    "담당하실",
    "수행업무",
    "업무내용",
    "업무소개",
    "업무를 소개",
    "하는 일",
    "이런 일을",
    "직무내용",
    "responsibilities",
    "what you'll do",
)
"""`responsibility` 로 읽는 라벨 표지.

`주요업무`·`담당업무` 구간은 요구가 아니라 맡을 일을 적는다. 자격 구간과 같은
차원을 가리켜도 필수·우대의 뜻을 담지 않으므로 세 번째 값을 따로 둔다
(docs/knowledge-schema.md 5장).

`업무` 한 글자짜리 표지를 두지 않는다. `업무 자동화 경험` 같은 요구 문장이 자격
구간 라벨에 섞이면 두 갈래가 겹쳐 `unknown` 으로 떨어진다.

`업무를 소개` 는 `업무소개` 의 조사 변형이다. docs/eval/backend_v1.json 의 실제 라벨
`합류하면 하게 될 업무를 소개해 드려요` 는 기대값이 `responsibility` 인데, 매칭 키가
공백만 지우고 조사는 남기므로 `업무소개` 한 표지로는 걸리지 않는다.
"""


def _keys(markers: tuple[str, ...]) -> tuple[str, ...]:
    """표지를 매칭 키로 옮긴다. 라벨과 표지가 같은 규칙을 지난다."""
    return tuple(key for key in (normalize_expression(m) for m in markers) if key)


_MARKERS: tuple[tuple[Requiredness, tuple[str, ...]], ...] = (
    (Requiredness.REQUIRED, _keys(REQUIRED_MARKERS)),
    (Requiredness.PREFERRED, _keys(PREFERRED_MARKERS)),
    (Requiredness.RESPONSIBILITY, _keys(RESPONSIBILITY_MARKERS)),
)
"""갈래와 그 갈래의 매칭 키. 순서는 판정에 영향을 주지 않는다."""


def matched_kinds(stated: str) -> tuple[Requiredness, ...]:
    """라벨 원문이 건드린 갈래 전부. 판정의 중간값이며 진단에 쓴다."""
    key = normalize_expression(stated)
    if not key:
        return ()
    return tuple(
        kind for kind, markers in _MARKERS if any(marker in key for marker in markers)
    )


def normalize_requiredness(stated: str | None) -> Requiredness:
    """공고 라벨 원문 하나를 네 열거값 하나로 옮긴다.

    갈래 표지가 정확히 하나 걸리면 그 갈래다. 표지가 없거나 둘 이상의 갈래가 함께
    걸리면 `unknown` 이다. 라벨이 비었을 때도 `unknown` 이며, 추출이 구간 라벨을
    찾지 못하면 빈 문자열이 오는 것이 정상이다
    (`agents/statistics/extractor.py` 의 추출 규칙 3).

    되돌릴 수 있는 판정만 한다. 원문은 `requirement_mentions` 에 남아 있으므로,
    표지 목록이 바뀌면 같은 mention 을 다시 정규화해 새 버전으로 재할당한다
    (docs/statistics-model.md 3.5).
    """
    kinds = matched_kinds(stated or "")
    if len(kinds) != 1:
        return Requiredness.UNKNOWN
    return kinds[0]


__all__ = [
    "PREFERRED_MARKERS",
    "REQUIRED_MARKERS",
    "REQUIREDNESS",
    "RESPONSIBILITY_MARKERS",
    "Requiredness",
    "matched_kinds",
    "normalize_requiredness",
]
