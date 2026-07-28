"""순위 융합.

키워드 검색과 벡터 검색의 결과를 하나의 순위로 합친다. 정의는 docs/agent-design.md
4.1이다.

```text
fusion_score(document) = Σ 1 / (k + rank_in_strategy)
```

점수 척도가 다른 검색기의 값을 직접 더하지 않고 순위만 쓴다. 두 검색기가 함께 상위로
올린 청크가 한쪽에서만 최상위인 청크보다 높은 점수를 받는다.

순수 함수다. 저장소와 생성 모델을 import 하지 않는다. 공통 실행 루프에서 융합은 A0
구간이라(docs/agent-design.md 5장) 판단이 들어갈 자리가 없다.

전략별 원래 순위와 원래 점수를 결과에 남긴다. `retrieval_candidates` 가
`strategy_rank`, `lexical_score`, `vector_score`, `fusion_score` 를 컬럼으로 갖기
때문이다. 표의 정의는 docs/knowledge-schema.md 11장이다.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from typing import Any

DEFAULT_K = 60
"""융합 상수. 값이 크면 상위 순위의 우위가 완만해지고 작으면 1위에 쏠린다."""

STRATEGY_KEYWORD = "keyword"
"""`retrieval_queries.strategy` 의 CHECK 와 같은 이름을 쓴다."""

STRATEGY_VECTOR = "vector"
"""위와 같다. 계측이 이 문자열을 그대로 기록한다."""


@dataclass(frozen=True, slots=True)
class StrategyCandidate:
    """전략 하나가 돌려준 후보.

    `score` 는 그 전략의 척도다. 키워드는 `ts_rank_cd`, 벡터는 1에서 코사인 거리를 뺀
    값이며 서로 비교하지 않는다. 융합은 순위만 쓰고 이 값은 기록으로만 옮긴다.
    """

    target_id: str
    score: float | None = None
    payload: dict[str, Any] = field(default_factory=dict)
    """후보에 딸린 값. 융합은 뜻을 읽지 않고 그대로 옮긴다."""


@dataclass(frozen=True, slots=True)
class FusedCandidate:
    """융합된 후보 하나.

    `retrieval_candidates` 한 줄에 그대로 대응한다. 융합 점수만 남기면 어느 전략이
    이 후보를 올렸는지 되짚을 수 없어 전략별 기여도를 계산하지 못한다.
    """

    target_id: str
    fusion_score: float
    strategy_ranks: dict[str, int] = field(default_factory=dict)
    """전략 이름에서 그 전략의 순위로 가는 대응. 순위는 1부터 센다."""

    strategy_scores: dict[str, float | None] = field(default_factory=dict)
    """전략 이름에서 그 전략의 원래 점수로 가는 대응."""

    lexical_score: float | None = None
    """키워드 전략의 원래 점수. 그 전략이 찾지 못했으면 없다."""

    vector_score: float | None = None
    """벡터 전략의 원래 점수. 그 전략이 찾지 못했으면 없다."""

    payload: dict[str, Any] = field(default_factory=dict)
    """후보에 딸린 값. 먼저 본 전략의 값을 남긴다."""

    @property
    def strategies(self) -> tuple[str, ...]:
        """이 후보를 올린 전략. 융합에 들어간 순서다."""
        return tuple(self.strategy_ranks)

    def rank_of(self, strategy: str) -> int | None:
        return self.strategy_ranks.get(strategy)

    def score_of(self, strategy: str) -> float | None:
        return self.strategy_scores.get(strategy)


def reciprocal_rank(rank: int, k: int = DEFAULT_K) -> float:
    """순위 하나의 기여분.

    1위가 가장 크고 순위가 내려갈수록 완만하게 준다. 점수가 아니라 순위를 쓰므로
    척도가 다른 검색기의 값을 견줄 필요가 없다.
    """
    if rank < 1:
        raise ValueError("rank 는 1 이상이다")
    if k < 0:
        raise ValueError("k 는 0 이상이다")
    return 1.0 / (k + rank)


def fuse(
    results: Mapping[str, Sequence[StrategyCandidate]],
    k: int = DEFAULT_K,
    limit: int | None = None,
) -> tuple[FusedCandidate, ...]:
    """전략별 후보 목록을 하나의 순위로 합친다.

    목록의 순서가 곧 그 전략의 순위다. 저장소가 이미 정렬해 돌려주므로 여기서 다시
    정렬하지 않는다. 한 전략이 같은 대상을 여러 번 담으면 가장 앞의 자리만 쓴다.

    빈 목록은 기여가 없을 뿐이다. 한 전략이 아무것도 찾지 못해도 나머지 전략의 순위가
    그대로 남는다.

    결정적이다. 융합 점수가 같으면 `target_id` 로 갈라 같은 입력에서 언제나 같은
    순서를 낸다.
    """
    if k < 0:
        raise ValueError("k 는 0 이상이다")
    if limit is not None and limit < 0:
        raise ValueError("limit 는 0 이상이다")

    ranks: dict[str, dict[str, int]] = {}
    scores: dict[str, dict[str, float | None]] = {}
    payloads: dict[str, dict[str, Any]] = {}
    totals: dict[str, float] = {}

    for strategy, candidates in results.items():
        for position, candidate in enumerate(candidates, start=1):
            target = candidate.target_id
            per_strategy = ranks.setdefault(target, {})
            if strategy in per_strategy:
                continue

            per_strategy[strategy] = position
            scores.setdefault(target, {})[strategy] = candidate.score
            merged = payloads.setdefault(target, {})
            for key, value in candidate.payload.items():
                merged.setdefault(key, value)
            totals[target] = totals.get(target, 0.0) + reciprocal_rank(position, k)

    fused = [
        FusedCandidate(
            target_id=target,
            fusion_score=totals[target],
            strategy_ranks=dict(per_strategy),
            strategy_scores=dict(scores[target]),
            lexical_score=scores[target].get(STRATEGY_KEYWORD),
            vector_score=scores[target].get(STRATEGY_VECTOR),
            payload=dict(payloads[target]),
        )
        for target, per_strategy in ranks.items()
    ]
    fused.sort(key=lambda candidate: (-candidate.fusion_score, candidate.target_id))
    return tuple(fused if limit is None else fused[:limit])
