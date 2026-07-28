"""활성 분류체계의 어휘와 표현 대조.

기지 추출은 활성 분류체계로 설명되는 표현을 골라내는 단계다. 정의는
docs/statistics-model.md 3.1이고, 어휘의 출처는 docs/erd.md 7.3·7.4·7.5 다.
차원 정체성은 `requirement_dimensions`, 버전별 라벨은
`requirement_dimension_versions`, 별칭은 `requirement_aliases` 에 있다.

순수 함수다. 저장소와 생성 모델을 import 하지 않는다. 행을 받아 값 객체를
만들고 문자열을 대조할 뿐이다.

`lifecycle_status` 가 `active` 인 차원만 어휘에 넣는다. 근거는 docs/erd.md 7.4 와
docs/statistics-model.md 3.3 이며, 승격 전 후보를 어휘로 쓰면 심사를 거치지 않은
차원이 집계에 들어간다.

어휘가 비어 있는 상태를 정상으로 취급한다. 첫 실행의 활성 분류체계에는 차원이
없고, 모든 표현이 잔여로 흘러 후보가 된다. 어휘가 채워진 뒤에도 같은 경로로
동작한다.
"""

from __future__ import annotations

import re
import unicodedata
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from typing import Any

_SEPARATOR = re.compile(r"[^\w+#.]|_")
"""매칭 키에서 공백으로 바꿀 글자.

`\\w` 밖의 모든 글자와 밑줄이다. `+`, `#`, `.` 는 남긴다. `C++`, `C#`, `.NET`,
`Node.js` 는 이 기호가 이름의 일부이며, 지우면 `C` 와 `C++` 와 `C#` 이 한 키로
합쳐진다. 서로 다른 요구가 하나의 숫자로 뭉개지는 것을 막는 것이
docs/statistics-model.md 3.2 의 요구다.
"""

CANONICAL = "canonical"
DISPLAY = "display"
ALIAS = "alias"
"""표현이 어휘의 어디에 걸렸는지. 별칭 일치와 라벨 일치를 구분해 기록한다."""


def normalize_expression(text: str) -> str:
    """표현 하나의 매칭 키.

    정규화는 되돌릴 수 없으므로 원문 표현은 손대지 않고 대조용 키만 만든다.
    `requirement_mentions.raw_expression` 은 근거 구간이 가리키는 원문 그대로
    남고, 이 함수의 결과는 어디에도 저장되지 않는다.

    하는 것과 그 근거는 다음과 같다.

    - NFKC 정규화. 전각·반각과 호환 문자를 하나로 모은다. 공고 원문에 `Ｊａｖａ`
      같은 전각 표기가 섞이며, 표기 폭은 요구의 차이가 아니다.
    - casefold. 영문 대소문자는 이 어휘에서 의미를 나르지 않는다. `Kafka` 와
      `kafka` 를 다른 요구로 세면 같은 요구가 두 번 세어진다.
    - 구분 기호를 공백으로. 괄호·따옴표·쉼표·가운뎃점·슬래시·붙임표·밑줄이
      대상이다. `CI/CD` 와 `CI-CD`, `메시지 큐(Message Queue)` 의 괄호는 표기
      습관이다.
    - 토큰 끝의 마침표 제거. 문장 끝 마침표가 키를 가른다. 앞의 마침표는 남기므로
      `.NET` 은 그대로다.
    - 공백 전부 제거. 한국어 띄어쓰기는 공고마다 흔들리며(`메시지 큐`와
      `메시지큐`) 그 흔들림은 요구의 차이가 아니다. 라틴 단어 경계도 함께
      사라지지만(`Spring Boot` → `springboot`) 이 방향의 병합은 표기 변형만
      모은다.

    하지 않는 것과 그 근거는 다음과 같다.

    - 조사·어미 제거와 형태소 분석을 하지 않는다. 사전 없이 자르면 오분해가
      생기고 그 결과는 되돌릴 수 없다.
    - 동의어 사전 치환을 하지 않는다. 글자가 다르면 다른 키다. 같은 개념인지의
      판정은 관계 판정의 몫이며, 근거는 docs/statistics-model.md 3.2 다.
    - 문자열 유사도로 키를 합치지 않는다. 메시지 큐와 비동기 처리와 이벤트 기반
      아키텍처는 함께 나타나지만 각각 다른 준비를 요구한다.
    - 불용어를 지우지 않는다. `경험`, `이해`, `우대` 는 깊이를 나르는 말이며
      지우면 서로 다른 요구 수준이 한 키로 모인다.
    """
    folded = unicodedata.normalize("NFKC", text).casefold()
    tokens = (token.rstrip(".") for token in _SEPARATOR.sub(" ", folded).split())
    return "".join(token for token in tokens if token)


@dataclass(frozen=True, slots=True)
class DimensionEntry:
    """어휘에 들어간 차원 하나.

    `requirement_dimensions` 와 그 버전 행에서 대조에 필요한 만큼만 담는다.
    """

    dimension_id: str
    dimension_kind: str
    internal_canonical_label: str
    display_label: str
    definition: str | None = None

    @property
    def labels(self) -> tuple[str, ...]:
        """이 차원의 라벨. 내부 표준 라벨과 표시 라벨이 같으면 하나다."""
        if self.display_label == self.internal_canonical_label:
            return (self.internal_canonical_label,)
        return (self.internal_canonical_label, self.display_label)


@dataclass(frozen=True, slots=True)
class VocabularyMatch:
    """표현이 기존 차원으로 설명된 결과."""

    dimension_id: str
    matched_text: str
    """어휘에 있던 표현. 표현 원문이 아니라 대조 상대다."""

    source: str
    """`canonical` · `display` · `alias`."""


def _bigrams(key: str) -> frozenset[str]:
    """매칭 키의 두 글자 조각. 언어를 가리지 않는다."""
    if len(key) < 2:
        return frozenset({key}) if key else frozenset()
    return frozenset(key[i : i + 2] for i in range(len(key) - 1))


def _overlap(left: frozenset[str], right: frozenset[str]) -> float:
    """두 조각 집합의 겹침 비율. 둘 중 하나가 비면 0 이다."""
    if not left or not right:
        return 0.0
    return len(left & right) / len(left | right)


class Vocabulary:
    """활성 분류체계 버전 하나의 어휘.

    표현을 정확히 설명하는 차원이 있는지 대조하고(`match`), 없으면 판정에 걸
    기존 차원을 추린다(`neighbours`).

    두 일이 다른 이유가 이 클래스의 전부다. 대조는 표기 차이만 흡수하는 결정적
    판단이라 자동으로 확정해도 요구가 뭉개지지 않는다. 추리기는 글자 겹침일 뿐이라
    무엇도 확정하지 못하고 판정의 입력만 만든다. 근거는
    docs/statistics-model.md 3.2 다.
    """

    def __init__(
        self,
        taxonomy_version_id: str,
        dimensions: Sequence[DimensionEntry] = (),
        aliases: Sequence[tuple[str, str]] = (),
    ) -> None:
        self.taxonomy_version_id = taxonomy_version_id
        self._dimensions: dict[str, DimensionEntry] = {
            d.dimension_id: d for d in dimensions
        }
        self._by_key: dict[str, VocabularyMatch] = {}
        self._conflicts: set[str] = set()
        self._forms: dict[str, frozenset[str]] = {}

        for entry in dimensions:
            for index, label in enumerate(entry.labels):
                self._register(
                    label, entry.dimension_id, CANONICAL if index == 0 else DISPLAY
                )
        for alias_text, dimension_id in aliases:
            self._register(alias_text, dimension_id, ALIAS)

    # ------------------------------------------------------------ 구성
    @classmethod
    def from_rows(
        cls,
        taxonomy_version_id: str,
        dimension_rows: Iterable[dict[str, Any]] = (),
        alias_rows: Iterable[dict[str, Any]] = (),
    ) -> Vocabulary:
        """저장소가 돌려준 행에서 어휘를 만든다.

        저장소는 행만 돌려주고 값 객체를 모른다. 조립을 여기 두면 어휘의 구성
        규칙이 한 곳에만 있다.
        """
        dimensions = [
            DimensionEntry(
                dimension_id=row["dimension_id"],
                dimension_kind=row["dimension_kind"],
                internal_canonical_label=row["internal_canonical_label"],
                display_label=row["display_label"],
                definition=row.get("definition"),
            )
            for row in dimension_rows
        ]
        known = {d.dimension_id for d in dimensions}
        aliases = [
            (row["alias_text"], row["dimension_id"])
            for row in alias_rows
            if row["dimension_id"] in known
        ]
        return cls(taxonomy_version_id, dimensions, aliases)

    def _register(self, text: str, dimension_id: str, source: str) -> None:
        """어휘 표현 하나를 키에 건다.

        서로 다른 차원의 표현이 같은 키로 접히면 둘 다 버린다.
        `requirement_aliases` 의 `UNIQUE (taxonomy_version_id, alias_text)` 는
        원문 표현끼리의 충돌만 막으므로, 정규화가 만든 충돌은 여기서 걸러야 한다.
        어느 쪽으로 붙일지 정할 근거가 없는 표현을 임의로 붙이면 그 차원의 빈도가
        조용히 부푼다.
        """
        key = normalize_expression(text)
        if not key or dimension_id not in self._dimensions:
            return
        self._forms[dimension_id] = self._forms.get(
            dimension_id, frozenset()
        ) | _bigrams(key)

        seen = self._by_key.get(key)
        if seen is None:
            self._by_key[key] = VocabularyMatch(dimension_id, text, source)
            return
        if seen.dimension_id != dimension_id:
            self._conflicts.add(key)
            del self._by_key[key]

    # ------------------------------------------------------------ 조회
    @property
    def is_empty(self) -> bool:
        """차원이 하나도 없는 상태. 냉시작에서 정상이다."""
        return not self._dimensions

    @property
    def dimensions(self) -> tuple[DimensionEntry, ...]:
        return tuple(self._dimensions.values())

    @property
    def conflicts(self) -> frozenset[str]:
        """정규화가 두 차원으로 접은 키. 어휘에서 빠졌다는 기록이다."""
        return frozenset(self._conflicts)

    def match(self, expression: str) -> VocabularyMatch | None:
        """표현을 어휘에 대조한다. 설명하는 차원이 없으면 비운다.

        키가 정확히 같을 때만 맞힌다. 부분 일치와 유사도는 여기서 쓰지 않는다.
        """
        key = normalize_expression(expression)
        if not key:
            return None
        return self._by_key.get(key)

    def neighbours(self, expression: str, limit: int = 5) -> tuple[DimensionEntry, ...]:
        """판정에 걸 기존 차원 후보.

        두 글자 조각의 겹침으로 추린다. 이 점수는 결론이 아니라 관계 판정의 입력을
        고르는 수단이며, 점수가 높다고 동의어로 확정하지 않는다. 겹침이 없는 차원은
        빼서 판정에 무관한 선택지를 넣지 않는다.

        같은 점수는 `dimension_id` 순으로 가른다. 재실행이 같은 목록을 준다.
        """
        key = normalize_expression(expression)
        if not key or limit <= 0:
            return ()
        grams = _bigrams(key)
        scored = [
            (_overlap(grams, self._forms.get(d.dimension_id, frozenset())), d)
            for d in self._dimensions.values()
        ]
        ranked = sorted(
            (item for item in scored if item[0] > 0.0),
            key=lambda item: (-item[0], item[1].dimension_id),
        )
        return tuple(entry for _, entry in ranked[:limit])
