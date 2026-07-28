"""임베딩 어댑터.

임베딩을 청크와 다른 표에 두는 이유는 docs/knowledge-schema.md 4.2에 있다. 모델을
바꿔도 청크를 다시 만들지 않는다. 그래서 이 어댑터는 청크를 모르고 문자열만 받는다.

모델 식별자와 차원은 `careersignal.providers.models.EMBEDDING` 이 갖는다.
`chunk_embeddings.embedding` 이 `vector(1536)` 이므로 차원이 바뀌면 migration 도 바뀐다.
"""

from __future__ import annotations

import hashlib
import math
import os
from collections.abc import Iterator, Sequence
from typing import Any, Protocol, runtime_checkable

from careersignal.providers.models import EMBEDDING, EmbeddingConfig

DEFAULT_BATCH_SIZE = 64
"""한 번에 보내는 문자열 개수. 근거는 docs/agent-design.md 13장이다."""


@runtime_checkable
class EmbeddingClient(Protocol):
    """문자열을 벡터로 바꾸는 것. 제공자를 감춘다.

    벡터는 입력과 같은 순서로 같은 개수가 나온다. 파이프라인이 청크 식별자를
    순서로 맞추기 때문에 이 약속이 깨지면 벡터가 다른 청크에 붙는다.
    """

    def embed(self, texts: list[str]) -> list[list[float]]: ...


def model_identifier(client: EmbeddingClient) -> str:
    """`chunk_embeddings.embedding_model` 에 남길 식별자.

    Protocol 은 `embed` 하나만 요구하므로 식별자는 있으면 쓰고 없으면 설정값을 쓴다.
    """
    return str(getattr(client, "model", EMBEDDING.model))


def batches(values: Sequence[Any], size: int) -> Iterator[list[Any]]:
    """앞에서부터 `size` 개씩 끊는다. 마지막 묶음만 작을 수 있다."""
    if size < 1:
        raise ValueError("size 는 1 이상이다")
    for start in range(0, len(values), size):
        yield list(values[start : start + size])


class OpenAIEmbeddingClient:
    """OpenAI 임베딩 어댑터.

    `text-embedding-3-large` 를 `dimensions` 로 축소해 받는다. 축소를 제공자에게
    맡기므로 벡터를 자르거나 다시 정규화하지 않는다.

    한 번에 보낼 개수를 나눠 호출한다. 묶음이 커지면 한 번의 실패가 잃는 양이 커지고,
    작아지면 왕복이 늘어난다.
    """

    def __init__(
        self,
        client: Any | None = None,
        *,
        config: EmbeddingConfig = EMBEDDING,
        batch_size: int = DEFAULT_BATCH_SIZE,
        api_key: str | None = None,
        timeout: float = 60.0,
    ) -> None:
        if batch_size < 1:
            raise ValueError("batch_size 는 1 이상이다")
        self._client = client
        self._config = config
        self._batch_size = batch_size
        self._api_key = api_key
        self._timeout = timeout

    @property
    def model(self) -> str:
        return self._config.model

    @property
    def dimensions(self) -> int:
        return self._config.dimensions

    @property
    def batch_size(self) -> int:
        return self._batch_size

    def embed(self, texts: list[str]) -> list[list[float]]:
        """문자열을 입력 순서 그대로 벡터로 바꾼다."""
        vectors: list[list[float]] = []
        for batch in batches(texts, self._batch_size):
            vectors.extend(self._embed_once(batch))
        return vectors

    # ------------------------------------------------------------ 내부
    def _embed_once(self, batch: list[str]) -> list[list[float]]:
        response = self._sdk().embeddings.create(
            model=self._config.model,
            input=batch,
            dimensions=self._config.dimensions,
        )
        items = sorted(response.data, key=lambda item: item.index)
        if len(items) != len(batch):
            raise ValueError(f"{len(batch)} 개를 보냈는데 {len(items)} 개가 왔다")

        vectors: list[list[float]] = []
        for item in items:
            vector = [float(v) for v in item.embedding]
            if len(vector) != self._config.dimensions:
                raise ValueError(
                    f"차원이 {self._config.dimensions} 가 아니라 {len(vector)} 다"
                )
            vectors.append(vector)
        return vectors

    def _sdk(self) -> Any:
        """실제로 호출할 때 만든다. 대역만 쓰는 실행 경로가 키를 요구하지 않는다."""
        if self._client is None:
            from openai import OpenAI

            key = self._api_key or os.getenv("OPENAI_API_KEY")
            if not key:
                raise RuntimeError("OPENAI_API_KEY 가 agent/.env 에 없다")
            self._client = OpenAI(api_key=key, timeout=self._timeout, max_retries=2)
        return self._client


class StubEmbeddingClient:
    """결정적 대역. 외부를 호출하지 않는다.

    같은 문자열은 언제나 같은 벡터를 준다. 해시에서 만들기 때문에 벡터에 뜻은 없지만,
    증분 판정과 차원 계약을 검사하는 데는 뜻이 필요 없다.

    `calls` 는 호출마다 받은 문자열 묶음이다. 나눠 호출했는지 확인하는 데 쓴다.
    """

    model = "stub-embedding"

    def __init__(self, dimensions: int = EMBEDDING.dimensions) -> None:
        if dimensions < 1:
            raise ValueError("dimensions 는 1 이상이다")
        self._dimensions = dimensions
        self.calls: list[list[str]] = []

    @property
    def dimensions(self) -> int:
        return self._dimensions

    def embed(self, texts: list[str]) -> list[list[float]]:
        self.calls.append(list(texts))
        return [self.vector(text) for text in texts]

    def vector(self, text: str) -> list[float]:
        """해시를 늘려 차원을 채우고 길이를 1로 맞춘다.

        코사인 거리로 검색하므로 길이를 맞춰 두면 실제 임베딩과 같은 범위에서 논다.
        """
        seed = text.encode("utf-8")
        raw = bytearray()
        counter = 0
        while len(raw) < self._dimensions * 2:
            raw += hashlib.sha256(seed + counter.to_bytes(4, "big")).digest()
            counter += 1

        values = [
            int.from_bytes(raw[i * 2 : i * 2 + 2], "big") / 32767.5 - 1.0
            for i in range(self._dimensions)
        ]
        norm = math.sqrt(sum(v * v for v in values))
        if norm == 0.0:
            return values
        return [v / norm for v in values]
