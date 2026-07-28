"""검색과 순위 융합 검증.

규칙은 docs/agent-design.md 4.1에서 온다. 저장소와 임베딩 제공자를 대역으로 대체하고
순위 융합과 전략 실패만 검사한다. 외부 호출과 데이터베이스 접근은 하지 않는다.
"""

from __future__ import annotations

from typing import Any

import pytest

from careersignal.providers.embeddings import StubEmbeddingClient
from careersignal.retrieval import (
    DEFAULT_K,
    STRATEGY_KEYWORD,
    STRATEGY_VECTOR,
    ChunkSearcher,
    StrategyCandidate,
    fuse,
    reciprocal_rank,
)

DATASET = "ds_test"
VERSION = "emb_v1"
QUERY = "대규모 트랜잭션 처리 경험"


def _rows(pairs: tuple[tuple[str, float], ...]) -> list[dict[str, Any]]:
    """저장소가 돌려주는 행의 모양. 앞이 상위다."""
    return [
        {
            "chunk_id": chunk_id,
            "snapshot_id": f"snap_{chunk_id}",
            "section": "자격요건",
            "text": f"{chunk_id} 의 본문",
            "score": score,
        }
        for chunk_id, score in pairs
    ]


def _candidates(*pairs: tuple[str, float]) -> tuple[StrategyCandidate, ...]:
    return tuple(StrategyCandidate(target_id=cid, score=score) for cid, score in pairs)


class FakeIndex:
    """검색 표현 저장소의 대역. 전략마다 돌려줄 행을 미리 담는다."""

    def __init__(
        self,
        keyword: tuple[tuple[str, float], ...] = (),
        vector: tuple[tuple[str, float], ...] = (),
    ) -> None:
        self.keyword_rows = _rows(keyword)
        self.vector_rows = _rows(vector)
        self.keyword_error: Exception | None = None
        self.vector_error: Exception | None = None
        self.calls: list[str] = []

    # -------------------------------------------------- IndexRepository 의 일부
    def keyword_search(
        self, dataset_version: str, query: str, limit: int = 50
    ) -> list[dict[str, Any]]:
        self.calls.append(STRATEGY_KEYWORD)
        if self.keyword_error is not None:
            raise self.keyword_error
        return [dict(row) for row in self.keyword_rows[:limit]]

    def vector_search(
        self,
        dataset_version: str,
        embedding: list[float],
        embedding_version: str,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        self.calls.append(STRATEGY_VECTOR)
        if self.vector_error is not None:
            raise self.vector_error
        return [dict(row) for row in self.vector_rows[:limit]]


class FailingEmbeddingClient(StubEmbeddingClient):
    """질의 임베딩에서 넘어지는 대역."""

    def embed(self, texts: list[str]) -> list[list[float]]:
        self.calls.append(list(texts))
        raise RuntimeError("임베딩 제공자 오류")


# ============================================================ 융합
def test_a_chunk_found_by_both_strategies_ranks_above_one_found_by_one() -> None:
    """두 검색기가 함께 올린 청크가 한쪽에서만 최상위인 청크보다 높은 점수를 받는다."""
    fused = fuse(
        {
            STRATEGY_KEYWORD: _candidates(("chunk_only_lex", 9.0), ("chunk_both", 0.1)),
            STRATEGY_VECTOR: _candidates(("chunk_only_vec", 0.9), ("chunk_both", 0.4)),
        }
    )

    assert fused[0].target_id == "chunk_both"
    assert fused[0].fusion_score > fused[1].fusion_score


def test_the_fusion_score_sums_the_reciprocal_of_each_original_rank() -> None:
    """점수 크기가 아니라 순위를 쓴다."""
    fused = fuse(
        {
            STRATEGY_KEYWORD: _candidates(("chunk_a", 0.01), ("chunk_b", 99.0)),
            STRATEGY_VECTOR: _candidates(("chunk_c", 0.9), ("chunk_d", 0.8), ("chunk_a", 0.1)),
        }
    )
    found = {candidate.target_id: candidate for candidate in fused}

    assert found["chunk_a"].fusion_score == pytest.approx(
        reciprocal_rank(1) + reciprocal_rank(3)
    )
    assert found["chunk_b"].fusion_score == pytest.approx(1 / (DEFAULT_K + 2))


def test_each_strategy_keeps_its_original_rank() -> None:
    """`retrieval_candidates.strategy_rank` 에 그대로 남길 값이다."""
    fused = fuse(
        {
            STRATEGY_KEYWORD: _candidates(("chunk_a", 1.0), ("chunk_b", 0.5)),
            STRATEGY_VECTOR: _candidates(("chunk_b", 0.9), ("chunk_a", 0.7)),
        }
    )
    found = {candidate.target_id: candidate for candidate in fused}

    assert found["chunk_a"].strategy_ranks == {STRATEGY_KEYWORD: 1, STRATEGY_VECTOR: 2}
    assert found["chunk_b"].rank_of(STRATEGY_KEYWORD) == 2
    assert found["chunk_b"].rank_of(STRATEGY_VECTOR) == 1


def test_the_original_scores_of_both_strategies_are_kept() -> None:
    """`lexical_score` 와 `vector_score` 가 따로 있는 컬럼이다."""
    fused = fuse(
        {
            STRATEGY_KEYWORD: _candidates(("chunk_a", 0.42)),
            STRATEGY_VECTOR: _candidates(("chunk_a", 0.87), ("chunk_b", 0.31)),
        }
    )
    found = {candidate.target_id: candidate for candidate in fused}

    assert found["chunk_a"].lexical_score == 0.42
    assert found["chunk_a"].vector_score == 0.87
    assert found["chunk_b"].lexical_score is None
    assert found["chunk_b"].vector_score == 0.31
    assert found["chunk_b"].score_of(STRATEGY_VECTOR) == 0.31


def test_the_same_input_gives_the_same_order() -> None:
    results = {
        STRATEGY_KEYWORD: _candidates(("chunk_a", 1.0), ("chunk_b", 1.0), ("chunk_c", 1.0)),
        STRATEGY_VECTOR: _candidates(("chunk_c", 0.9), ("chunk_a", 0.9), ("chunk_d", 0.9)),
    }

    first = [candidate.target_id for candidate in fuse(results)]
    second = [candidate.target_id for candidate in fuse(results)]

    assert first == second


def test_the_same_fusion_score_is_broken_by_the_identifier() -> None:
    """점수가 같아도 순서가 흔들리지 않아야 같은 근거 집합이 나온다."""
    fused = fuse({STRATEGY_KEYWORD: _candidates(("chunk_z", 1.0)),
                  STRATEGY_VECTOR: _candidates(("chunk_a", 1.0))})

    assert fused[0].fusion_score == fused[1].fusion_score
    assert [candidate.target_id for candidate in fused] == ["chunk_a", "chunk_z"]


def test_an_empty_strategy_leaves_the_other_ranking_unchanged() -> None:
    only_keyword = _candidates(("chunk_a", 1.0), ("chunk_b", 0.5))

    with_empty = fuse({STRATEGY_KEYWORD: only_keyword, STRATEGY_VECTOR: ()})
    alone = fuse({STRATEGY_KEYWORD: only_keyword})

    assert [c.target_id for c in with_empty] == [c.target_id for c in alone]
    assert with_empty[0].vector_score is None


def test_a_bigger_constant_flattens_the_gap_between_ranks() -> None:
    """k 는 상위 순위의 우위를 얼마나 누그러뜨릴지 정한다."""
    results = {STRATEGY_KEYWORD: _candidates(("chunk_a", 1.0), ("chunk_b", 0.5))}

    sharp = fuse(results, k=0)
    flat = fuse(results, k=1000)

    assert sharp[0].fusion_score - sharp[1].fusion_score > (
        flat[0].fusion_score - flat[1].fusion_score
    )


def test_a_repeated_target_in_one_strategy_uses_its_best_rank() -> None:
    fused = fuse(
        {STRATEGY_KEYWORD: _candidates(("chunk_a", 1.0), ("chunk_a", 0.2))}
    )

    assert len(fused) == 1
    assert fused[0].strategy_ranks == {STRATEGY_KEYWORD: 1}


def test_a_limit_keeps_the_top_of_the_fused_ranking() -> None:
    fused = fuse(
        {
            STRATEGY_KEYWORD: _candidates(("chunk_a", 1.0), ("chunk_b", 0.5)),
            STRATEGY_VECTOR: _candidates(("chunk_b", 0.9), ("chunk_c", 0.8)),
        },
        limit=1,
    )

    assert [candidate.target_id for candidate in fused] == ["chunk_b"]


def test_a_negative_constant_is_refused() -> None:
    with pytest.raises(ValueError):
        fuse({STRATEGY_KEYWORD: _candidates(("chunk_a", 1.0))}, k=-1)


# ============================================================ 검색
def test_search_runs_both_strategies_and_fuses_them() -> None:
    store = FakeIndex(
        keyword=(("chunk_only_lex", 9.0), ("chunk_both", 0.1)),
        vector=(("chunk_only_vec", 0.9), ("chunk_both", 0.4)),
    )

    outcome = ChunkSearcher(store, StubEmbeddingClient()).search(QUERY, DATASET, VERSION)

    assert store.calls == [STRATEGY_KEYWORD, STRATEGY_VECTOR]
    assert outcome.counts == {STRATEGY_KEYWORD: 2, STRATEGY_VECTOR: 2}
    assert outcome.total == 3
    assert outcome.candidates[0].target_id == "chunk_both"
    assert outcome.complete


def test_an_empty_vector_result_still_returns_keyword_candidates() -> None:
    """임베딩을 아직 채우지 않은 데이터셋에서는 키워드만으로 결과가 나온다."""
    store = FakeIndex(keyword=(("chunk_a", 1.0), ("chunk_b", 0.5)), vector=())

    outcome = ChunkSearcher(store, StubEmbeddingClient()).search(QUERY, DATASET, VERSION)

    assert [c.target_id for c in outcome.candidates] == ["chunk_a", "chunk_b"]
    assert outcome.count_of(STRATEGY_VECTOR) == 0
    assert outcome.complete


def test_an_empty_keyword_result_still_returns_vector_candidates() -> None:
    """키워드 검색은 표현이 다르면 놓친다."""
    store = FakeIndex(keyword=(), vector=(("chunk_c", 0.9), ("chunk_d", 0.8)))

    outcome = ChunkSearcher(store, StubEmbeddingClient()).search(QUERY, DATASET, VERSION)

    assert [c.target_id for c in outcome.candidates] == ["chunk_c", "chunk_d"]
    assert outcome.count_of(STRATEGY_KEYWORD) == 0
    assert outcome.complete


def test_a_failing_vector_strategy_leaves_the_keyword_result() -> None:
    store = FakeIndex(keyword=(("chunk_a", 1.0),), vector=(("chunk_b", 0.9),))
    store.vector_error = RuntimeError("벡터 인덱스 오류")

    outcome = ChunkSearcher(store, StubEmbeddingClient()).search(QUERY, DATASET, VERSION)

    assert [c.target_id for c in outcome.candidates] == ["chunk_a"]
    assert outcome.failed[0][0] == STRATEGY_VECTOR
    assert "벡터 인덱스 오류" in outcome.failed[0][1]
    assert not outcome.complete


def test_a_failing_keyword_strategy_leaves_the_vector_result() -> None:
    store = FakeIndex(keyword=(("chunk_a", 1.0),), vector=(("chunk_b", 0.9),))
    store.keyword_error = RuntimeError("텍스트 인덱스 오류")

    outcome = ChunkSearcher(store, StubEmbeddingClient()).search(QUERY, DATASET, VERSION)

    assert [c.target_id for c in outcome.candidates] == ["chunk_b"]
    assert outcome.failed[0][0] == STRATEGY_KEYWORD


def test_a_failing_query_embedding_leaves_the_keyword_result() -> None:
    """질의를 벡터로 바꾸지 못해도 키워드 순위는 그대로 쓴다."""
    store = FakeIndex(keyword=(("chunk_a", 1.0),), vector=(("chunk_b", 0.9),))

    outcome = ChunkSearcher(store, FailingEmbeddingClient()).search(QUERY, DATASET, VERSION)

    assert [c.target_id for c in outcome.candidates] == ["chunk_a"]
    assert store.calls == [STRATEGY_KEYWORD]
    assert "임베딩 제공자 오류" in outcome.failed[0][1]


def test_the_query_is_embedded_once() -> None:
    store = FakeIndex(vector=(("chunk_a", 0.9),))
    client = StubEmbeddingClient()

    ChunkSearcher(store, client).search(QUERY, DATASET, VERSION)

    assert client.calls == [[QUERY]]


def test_search_keeps_the_original_scores_of_both_strategies() -> None:
    store = FakeIndex(keyword=(("chunk_a", 0.42),), vector=(("chunk_a", 0.87),))

    outcome = ChunkSearcher(store, StubEmbeddingClient()).search(QUERY, DATASET, VERSION)

    assert outcome.candidates[0].lexical_score == 0.42
    assert outcome.candidates[0].vector_score == 0.87


def test_search_carries_the_chunk_text_and_section() -> None:
    """근거를 조립할 때 본문을 다시 조회하지 않는다."""
    store = FakeIndex(keyword=(("chunk_a", 1.0),))

    outcome = ChunkSearcher(store, StubEmbeddingClient()).search(QUERY, DATASET, VERSION)

    assert outcome.candidates[0].payload["section"] == "자격요건"
    assert outcome.candidates[0].payload["snapshot_id"] == "snap_chunk_a"


def test_the_same_query_gives_the_same_order() -> None:
    store = FakeIndex(
        keyword=(("chunk_a", 1.0), ("chunk_b", 1.0), ("chunk_c", 1.0)),
        vector=(("chunk_c", 0.9), ("chunk_a", 0.9), ("chunk_d", 0.9)),
    )
    searcher = ChunkSearcher(store, StubEmbeddingClient())

    first = searcher.search(QUERY, DATASET, VERSION)
    second = searcher.search(QUERY, DATASET, VERSION)

    assert [c.target_id for c in first.candidates] == [
        c.target_id for c in second.candidates
    ]
    assert first.candidates == second.candidates


def test_a_limit_bounds_the_fused_result() -> None:
    store = FakeIndex(
        keyword=(("chunk_a", 1.0), ("chunk_b", 0.5)),
        vector=(("chunk_c", 0.9), ("chunk_d", 0.8)),
    )

    outcome = ChunkSearcher(store, StubEmbeddingClient()).search(
        QUERY, DATASET, VERSION, limit=2
    )

    assert outcome.total == 2


def test_an_empty_query_is_refused() -> None:
    with pytest.raises(ValueError):
        ChunkSearcher(FakeIndex(), StubEmbeddingClient()).search("   ", DATASET, VERSION)


def test_a_limit_below_one_is_refused() -> None:
    with pytest.raises(ValueError):
        ChunkSearcher(FakeIndex(), StubEmbeddingClient()).search(
            QUERY, DATASET, VERSION, limit=0
        )
