"""청크 검색.

키워드 검색과 벡터 검색을 각각 돌리고 순위로 융합한다. 전략을 고르는 규칙은
docs/agent-design.md 4장, 융합은 4.1, 초기 검색의 구성은 4.2다.

두 검색은 서로 다른 실패를 한다. 키워드 검색은 표현이 다르면 놓치고 벡터 검색은 희귀
고유명사에서 정확도가 떨어진다. 그래서 두 결과를 독립적으로 만들고, 한 전략이 실패하거나
아무것도 찾지 못해도 나머지 전략의 순위를 그대로 돌려준다. 임베딩을 아직 채우지 않은
데이터셋에서는 키워드만으로 결과가 나온다.

계측은 하지 않는다. `retrieval_runs`·`retrieval_queries`·`retrieval_candidates` 기록은
docs/knowledge-schema.md 11장의 계측 표를 쓰는 별도 단계이며, 이 단계는 후보와 융합
결과를 만들어 넘기는 데까지다.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field
from typing import Any

from careersignal.providers.embeddings import EmbeddingClient
from careersignal.repositories.indexing import IndexRepository
from careersignal.retrieval.fusion import (
    DEFAULT_K,
    STRATEGY_KEYWORD,
    STRATEGY_VECTOR,
    FusedCandidate,
    StrategyCandidate,
    fuse,
)

DEFAULT_LIMIT = 20
"""돌려줄 후보 수. 전략마다 이만큼 가져와 융합한 뒤 상위 이만큼을 남긴다."""

TARGET_TYPE = "chunk"
"""`retrieval_candidates.target_type` 의 CHECK 와 같은 이름이다."""

VECTOR_COUNT_MISMATCH = "질의 벡터가 하나가 아니다"
"""임베딩은 입력과 같은 개수를 돌려준다. 어긋나면 어느 벡터도 믿을 수 없다."""


@dataclass(frozen=True, slots=True)
class SearchOutcome:
    """검색 한 번의 결과."""

    query_text: str
    candidates: tuple[FusedCandidate, ...] = ()
    """융합된 순위. 앞이 위다."""

    counts: dict[str, int] = field(default_factory=dict)
    """전략 이름에서 그 전략이 돌려준 후보 수로 가는 대응."""

    failed: tuple[tuple[str, str], ...] = ()
    """돌지 못한 전략. `(전략 이름, 사유)` 다."""

    @property
    def total(self) -> int:
        return len(self.candidates)

    @property
    def complete(self) -> bool:
        """모든 전략이 돌았는지. 결과가 비어 있는 것과는 다르다."""
        return not self.failed

    def count_of(self, strategy: str) -> int:
        return self.counts.get(strategy, 0)


class ChunkSearcher:
    """청크를 두 전략으로 찾아 융합한다."""

    def __init__(self, repository: IndexRepository, client: EmbeddingClient) -> None:
        self._repository = repository
        self._client = client

    def search(
        self,
        query_text: str,
        dataset_version: str,
        embedding_version: str,
        limit: int = DEFAULT_LIMIT,
        k: int = DEFAULT_K,
    ) -> SearchOutcome:
        """키워드와 벡터로 찾고 순위로 합친다.

        전략 하나의 실패는 그 전략만 비우고 사유를 남긴다. 실패와 빈 결과를 나눠
        기록하므로, 벡터 결과가 없을 때 임베딩이 아직 없는 것인지 검색이 넘어진
        것인지 구분할 수 있다.
        """
        if not query_text.strip():
            raise ValueError("query_text 가 비었다")
        if limit < 1:
            raise ValueError("limit 는 1 이상이다")

        failed: list[tuple[str, str]] = []
        results: dict[str, tuple[StrategyCandidate, ...]] = {}

        for strategy, run in (
            (STRATEGY_KEYWORD, self._keyword),
            (STRATEGY_VECTOR, self._vector),
        ):
            found, problem = run(query_text, dataset_version, embedding_version, limit)
            results[strategy] = found
            if problem is not None:
                failed.append((strategy, problem))

        return SearchOutcome(
            query_text=query_text,
            candidates=fuse(results, k=k, limit=limit),
            counts={strategy: len(found) for strategy, found in results.items()},
            failed=tuple(failed),
        )

    # ------------------------------------------------------------ 전략
    def _keyword(
        self,
        query_text: str,
        dataset_version: str,
        embedding_version: str,
        limit: int,
    ) -> tuple[tuple[StrategyCandidate, ...], str | None]:
        """생성된 `tsv` 열로 찾는다. 점수는 `ts_rank_cd` 다."""
        try:
            rows = self._repository.keyword_search(dataset_version, query_text, limit=limit)
            return _candidates(rows), None
        except Exception as exc:  # noqa: BLE001
            return (), _reason(exc)

    def _vector(
        self,
        query_text: str,
        dataset_version: str,
        embedding_version: str,
        limit: int,
    ) -> tuple[tuple[StrategyCandidate, ...], str | None]:
        """질의를 벡터로 바꿔 코사인 거리로 찾는다.

        임베딩 호출과 검색을 함께 감싼다. 어느 쪽이 넘어져도 벡터 전략만 비고 키워드
        결과는 남는다.
        """
        try:
            vectors = self._client.embed([query_text])
        except Exception as exc:  # noqa: BLE001
            return (), _reason(exc)

        if len(vectors) != 1:
            return (), VECTOR_COUNT_MISMATCH

        try:
            rows = self._repository.vector_search(
                dataset_version,
                [float(value) for value in vectors[0]],
                embedding_version,
                limit=limit,
            )
            return _candidates(rows), None
        except Exception as exc:  # noqa: BLE001
            return (), _reason(exc)


# ------------------------------------------------------------ 내부
def _candidates(rows: Sequence[dict[str, Any]]) -> tuple[StrategyCandidate, ...]:
    """저장소 행을 후보로 옮긴다.

    행의 순서가 그 전략의 순위다. 청크 식별자와 점수 외의 열은 문맥이므로 그대로
    싣는다. 근거를 조립할 때 본문을 다시 조회하지 않기 위해서다.
    """
    found: list[StrategyCandidate] = []
    for row in rows:
        score = row.get("score")
        found.append(
            StrategyCandidate(
                target_id=str(row["chunk_id"]),
                score=None if score is None else float(score),
                payload={
                    key: value
                    for key, value in row.items()
                    if key not in ("chunk_id", "score")
                },
            )
        )
    return tuple(found)


def _reason(exc: Exception) -> str:
    return f"{type(exc).__name__}: {exc}"
