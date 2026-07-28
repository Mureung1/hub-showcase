"""임베딩 인덱싱 검증.

규칙은 docs/knowledge-schema.md 4.2에서 온다. 저장소와 임베딩 제공자를 대역으로
대체하고 증분 판정과 차원 계약만 검사한다. 외부 호출은 하지 않는다.
"""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest

from careersignal.pipelines import (
    DIMENSION_MISMATCH,
    EMPTY_TEXT,
    EmbeddingIndexer,
)
from careersignal.providers.embeddings import (
    OpenAIEmbeddingClient,
    StubEmbeddingClient,
)
from careersignal.providers.models import EMBEDDING

DATASET = "ds_test"
VERSION = "emb_v1"
TEXTS = (
    "회사 우아한형제들 · 섹션 자격요건 · 대규모 트랜잭션 처리 경험",
    "회사 우아한형제들 · 섹션 우대사항 · 분산 캐시 운영 경험",
    "회사 토스 · 섹션 자격요건 · JVM 기반 서비스 개발 경험",
    "회사 토스 · 섹션 우대사항 · Kubernetes 운영 경험",
    "회사 네이버 · 섹션 자격요건 · Java 또는 Kotlin 숙련",
)


class FakeIndex:
    """검색 표현 저장소의 대역. 청크와 임베딩을 따로 담는다."""

    def __init__(self, count: int = 2) -> None:
        self.chunks: list[dict[str, Any]] = []
        self.embeddings: dict[tuple[str, str], dict[str, Any]] = {}
        for ordinal in range(count):
            self.add_chunk(f"chunk_{ordinal + 1}", TEXTS[ordinal % len(TEXTS)])

    def add_chunk(self, chunk_id: str, embedding_text: str) -> None:
        self.chunks.append({"chunk_id": chunk_id, "embedding_text": embedding_text})

    # -------------------------------------------------- IndexRepository 의 일부
    def chunks_without_embedding(
        self, dataset_version: str, embedding_version: str, limit: int = 500
    ) -> list[dict[str, Any]]:
        missing = [
            row
            for row in self.chunks
            if (row["chunk_id"], embedding_version) not in self.embeddings
        ]
        return sorted(missing, key=lambda row: row["chunk_id"])[:limit]

    def add_embedding(
        self,
        chunk_id: str,
        embedding: list[float],
        embedding_model: str,
        embedding_version: str,
    ) -> None:
        self.embeddings[(chunk_id, embedding_version)] = {
            "embedding": embedding,
            "embedding_model": embedding_model,
            "embedding_dimension": len(embedding),
        }

    def chunk_count(self, dataset_version: str) -> int:
        return len(self.chunks)

    def embedding_count(self, dataset_version: str, embedding_version: str) -> int:
        return sum(1 for _, version in self.embeddings if version == embedding_version)


class FlakyEmbeddingClient(StubEmbeddingClient):
    """특정 문자열이 든 묶음만 실패하는 대역."""

    def __init__(self, poison: str) -> None:
        super().__init__()
        self._poison = poison

    def embed(self, texts: list[str]) -> list[list[float]]:
        if any(self._poison in text for text in texts):
            self.calls.append(list(texts))
            raise RuntimeError("임베딩 제공자 오류")
        return super().embed(texts)


class FakeOpenAI:
    """OpenAI 클라이언트의 대역. 요청만 기록하고 외부로 나가지 않는다."""

    def __init__(self, reverse: bool = False) -> None:
        self.requests: list[dict[str, Any]] = []
        self._reverse = reverse
        self.embeddings = SimpleNamespace(create=self._create)

    def _create(self, model: str, input: list[str], dimensions: int) -> Any:
        self.requests.append({"model": model, "input": list(input), "dimensions": dimensions})
        items = [
            SimpleNamespace(index=i, embedding=[float(i)] * dimensions)
            for i in range(len(input))
        ]
        return SimpleNamespace(data=list(reversed(items)) if self._reverse else items)


# ============================================================ 증분
def test_only_chunks_without_an_embedding_are_filled() -> None:
    store = FakeIndex(count=2)
    store.add_embedding("chunk_1", [0.0] * EMBEDDING.dimensions, "stub-embedding", VERSION)
    client = StubEmbeddingClient()

    outcome = EmbeddingIndexer(store, client).run(DATASET, VERSION)

    assert outcome.embedded == 1
    assert client.calls == [[TEXTS[1]]]


def test_running_twice_fills_nothing() -> None:
    """증분 재실행의 판정은 저장소가 준 대상 목록 하나로 갈린다."""
    store = FakeIndex(count=3)
    client = StubEmbeddingClient()
    indexer = EmbeddingIndexer(store, client)
    indexer.run(DATASET, VERSION)

    outcome = indexer.run(DATASET, VERSION)

    assert outcome.embedded == 0
    assert outcome.remaining == 0
    assert outcome.complete
    assert len(store.embeddings) == 3


def test_a_new_chunk_is_filled_on_the_next_run() -> None:
    store = FakeIndex(count=2)
    client = StubEmbeddingClient()
    indexer = EmbeddingIndexer(store, client)
    indexer.run(DATASET, VERSION)
    store.add_chunk("chunk_9", TEXTS[2])

    outcome = indexer.run(DATASET, VERSION)

    assert outcome.embedded == 1
    assert client.calls[-1] == [TEXTS[2]]
    assert len(store.embeddings) == 3


def test_a_new_embedding_version_fills_every_chunk_again() -> None:
    """모델을 바꾸면 새 버전으로 다시 채우고 이전 벡터를 남긴다."""
    store = FakeIndex(count=2)
    indexer = EmbeddingIndexer(store, StubEmbeddingClient())
    indexer.run(DATASET, VERSION)

    outcome = indexer.run(DATASET, "emb_v2")

    assert outcome.embedded == 2
    assert len(store.embeddings) == 4


# ============================================================ 묶음과 차원
def test_more_chunks_than_a_batch_are_split_into_several_calls() -> None:
    store = FakeIndex(count=5)
    client = StubEmbeddingClient()

    outcome = EmbeddingIndexer(store, client).run(DATASET, VERSION, batch_size=2)

    assert outcome.embedded == 5
    assert [len(call) for call in client.calls] == [2, 2, 1]


def test_every_vector_has_the_column_dimension() -> None:
    """`chunk_embeddings.embedding` 이 `vector(1536)` 이다."""
    store = FakeIndex(count=2)

    EmbeddingIndexer(store, StubEmbeddingClient()).run(DATASET, VERSION)

    assert EMBEDDING.dimensions == 1536
    assert all(len(row["embedding"]) == 1536 for row in store.embeddings.values())


def test_the_same_text_always_gives_the_same_vector() -> None:
    client = StubEmbeddingClient()

    assert client.embed([TEXTS[0]]) == client.embed([TEXTS[0]])
    assert client.embed([TEXTS[0]]) != client.embed([TEXTS[1]])


def test_the_stored_model_identifier_comes_from_the_client() -> None:
    store = FakeIndex(count=1)

    EmbeddingIndexer(store, StubEmbeddingClient()).run(DATASET, VERSION)

    assert store.embeddings[("chunk_1", VERSION)]["embedding_model"] == "stub-embedding"


def test_a_vector_of_another_dimension_is_refused() -> None:
    store = FakeIndex(count=1)

    outcome = EmbeddingIndexer(store, StubEmbeddingClient(dimensions=8)).run(DATASET, VERSION)

    assert outcome.embedded == 0
    assert outcome.failed == (("chunk_1", DIMENSION_MISMATCH),)
    assert store.embeddings == {}


# ============================================================ 실패
def test_a_failing_batch_does_not_block_the_rest() -> None:
    store = FakeIndex(count=5)
    client = FlakyEmbeddingClient(poison=TEXTS[2])

    outcome = EmbeddingIndexer(store, client).run(DATASET, VERSION, batch_size=2)

    assert outcome.embedded == 3
    assert {chunk_id for chunk_id, _ in outcome.failed} == {"chunk_3", "chunk_4"}
    assert set(store.embeddings) == {
        ("chunk_1", VERSION),
        ("chunk_2", VERSION),
        ("chunk_5", VERSION),
    }


def test_a_failure_is_reported_with_a_reason_and_left_remaining() -> None:
    store = FakeIndex(count=2)
    client = FlakyEmbeddingClient(poison=TEXTS[1])

    outcome = EmbeddingIndexer(store, client).run(DATASET, VERSION, batch_size=1)

    assert outcome.remaining == 1
    assert not outcome.complete
    assert outcome.failed[0][0] == "chunk_2"
    assert "임베딩 제공자 오류" in outcome.failed[0][1]


def test_a_chunk_without_text_is_reported_and_not_sent() -> None:
    store = FakeIndex(count=1)
    store.add_chunk("chunk_blank", "   ")
    client = StubEmbeddingClient()

    outcome = EmbeddingIndexer(store, client).run(DATASET, VERSION)

    assert outcome.embedded == 1
    assert outcome.failed == (("chunk_blank", EMPTY_TEXT),)
    assert client.calls == [[TEXTS[0]]]


def test_a_batch_size_below_one_is_refused() -> None:
    with pytest.raises(ValueError):
        EmbeddingIndexer(FakeIndex(count=1), StubEmbeddingClient()).run(
            DATASET, VERSION, batch_size=0
        )


# ============================================================ OpenAI 어댑터
def test_the_openai_client_splits_requests_by_batch_size() -> None:
    sdk = FakeOpenAI()
    client = OpenAIEmbeddingClient(sdk, batch_size=2)

    vectors = client.embed(["a", "b", "c"])

    assert len(vectors) == 3
    assert [len(request["input"]) for request in sdk.requests] == [2, 1]


def test_the_openai_client_asks_for_the_configured_model_and_dimensions() -> None:
    sdk = FakeOpenAI()

    OpenAIEmbeddingClient(sdk).embed(["a"])

    assert sdk.requests[0]["model"] == EMBEDDING.model
    assert sdk.requests[0]["dimensions"] == 1536


def test_the_openai_client_keeps_the_input_order() -> None:
    """벡터를 청크에 순서로 붙이므로 응답 순서를 믿지 않는다."""
    sdk = FakeOpenAI(reverse=True)

    vectors = OpenAIEmbeddingClient(sdk, batch_size=3).embed(["a", "b", "c"])

    assert [vector[0] for vector in vectors] == [0.0, 1.0, 2.0]
