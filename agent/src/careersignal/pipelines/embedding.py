"""임베딩 인덱싱 파이프라인.

정의는 docs/knowledge-schema.md 4.2를 따른다. 결정적 helper 다. 에이전트를 시작하지
않고 생성 모델로 판단하지 않는다.

임베딩은 청크와 따로 저장한다. 모델을 바꾸면 새 `embedding_version` 으로 다시 채우고
이전 벡터를 보존한다. 그래서 이 파이프라인은 청크를 만들지 않고 빈 자리만 채운다.

증분은 저장소가 정한다. `chunks_without_embedding` 이 같은 버전의 임베딩을 이미 가진
청크를 빼고 돌려주므로, 다시 실행하면 그 사이에 생긴 청크만 채운다. 채운 결과가 곧
다음 실행의 대상 판정이라 별도의 진행 표시를 두지 않는다.

한 묶음의 실패는 그 묶음의 청크만 결과에 남기고 나머지는 계속 채운다. 임베딩은 외부
호출이라 일부만 실패하는 일이 정상 범위에 있고, 실패한 청크는 다음 실행이 다시 집는다.
"""

from __future__ import annotations

from dataclasses import dataclass

from careersignal.providers.embeddings import (
    DEFAULT_BATCH_SIZE,
    EmbeddingClient,
    batches,
    model_identifier,
)
from careersignal.providers.models import EMBEDDING
from careersignal.repositories.indexing import IndexRepository

PAGE_SIZE = 500
"""한 번에 가져오는 대상 청크 수. 묶음 크기와 무관하게 메모리에 올릴 양을 정한다."""

EMPTY_TEXT = "embedding_text 가 비었다"
"""문맥까지 비어 있으면 검색으로 찾을 수 없으므로 벡터를 만들지 않는다."""

DIMENSION_MISMATCH = "차원이 벡터 열과 다르다"
"""`chunk_embeddings.embedding` 이 `vector(1536)` 이라 다른 차원은 넣을 수 없다."""

COUNT_MISMATCH = "보낸 개수와 받은 개수가 다르다"
"""순서로 청크와 벡터를 맞추므로 개수가 어긋나면 어느 짝도 믿을 수 없다."""


@dataclass(frozen=True, slots=True)
class EmbeddingOutcome:
    """임베딩 한 번의 결과."""

    embedded: int = 0
    """이번 실행에서 새로 채운 청크 수."""

    remaining: int = 0
    """실행이 끝난 뒤에도 이 버전의 임베딩이 없는 청크 수."""

    failed: tuple[tuple[str, str], ...] = ()
    """채우지 못한 청크. `(청크 식별자, 사유)` 다."""

    @property
    def complete(self) -> bool:
        return self.remaining == 0 and not self.failed


class EmbeddingIndexer:
    """임베딩이 없는 청크를 찾아 벡터를 채운다."""

    def __init__(self, repository: IndexRepository, client: EmbeddingClient) -> None:
        self._repository = repository
        self._client = client
        self._dimensions = EMBEDDING.dimensions

    def run(
        self,
        dataset_version: str,
        embedding_version: str,
        batch_size: int = DEFAULT_BATCH_SIZE,
    ) -> EmbeddingOutcome:
        """이 데이터셋에서 이 버전의 임베딩이 없는 청크를 모두 채운다.

        대상을 `PAGE_SIZE` 만큼 가져와 `batch_size` 묶음으로 나눠 호출하고, 더 가져올
        청크가 없을 때까지 되풀이한다. 실패한 청크는 저장소가 계속 대상으로 돌려주므로
        이번 실행에서는 다시 집지 않는다. 그래야 실패한 묶음에서 맴돌지 않는다.
        """
        if batch_size < 1:
            raise ValueError("batch_size 는 1 이상이다")

        model = model_identifier(self._client)
        embedded = 0
        failed: list[tuple[str, str]] = []
        refused: set[str] = set()

        while True:
            pending = [
                row
                for row in self._repository.chunks_without_embedding(
                    dataset_version, embedding_version, limit=PAGE_SIZE
                )
                if row["chunk_id"] not in refused
            ]
            if not pending:
                break

            for batch in batches(pending, batch_size):
                stored, problems = self._fill(batch, model, embedding_version)
                embedded += stored
                failed.extend(problems)
                refused.update(chunk_id for chunk_id, _ in problems)

        return EmbeddingOutcome(
            embedded=embedded,
            remaining=self._remaining(dataset_version, embedding_version),
            failed=tuple(failed),
        )

    # ------------------------------------------------------------ 내부
    def _fill(
        self,
        rows: list[dict[str, object]],
        model: str,
        embedding_version: str,
    ) -> tuple[int, list[tuple[str, str]]]:
        """묶음 하나를 채운다. 채운 수와 실패 목록을 돌려준다."""
        problems: list[tuple[str, str]] = []
        usable: list[tuple[str, str]] = []

        for row in rows:
            chunk_id = str(row["chunk_id"])
            text = str(row.get("embedding_text") or "")
            if not text.strip():
                problems.append((chunk_id, EMPTY_TEXT))
                continue
            usable.append((chunk_id, text))

        if not usable:
            return 0, problems

        try:
            vectors = self._client.embed([text for _, text in usable])
        except Exception as exc:  # noqa: BLE001
            reason = f"{type(exc).__name__}: {exc}"
            problems.extend((chunk_id, reason) for chunk_id, _ in usable)
            return 0, problems

        if len(vectors) != len(usable):
            problems.extend((chunk_id, COUNT_MISMATCH) for chunk_id, _ in usable)
            return 0, problems

        stored = 0
        for (chunk_id, _), vector in zip(usable, vectors):
            if len(vector) != self._dimensions:
                problems.append((chunk_id, DIMENSION_MISMATCH))
                continue
            try:
                self._repository.add_embedding(
                    chunk_id=chunk_id,
                    embedding=[float(v) for v in vector],
                    embedding_model=model,
                    embedding_version=embedding_version,
                )
            except Exception as exc:  # noqa: BLE001
                problems.append((chunk_id, f"{type(exc).__name__}: {exc}"))
                continue
            stored += 1

        return stored, problems

    def _remaining(self, dataset_version: str, embedding_version: str) -> int:
        """아직 이 버전의 벡터가 없는 청크 수."""
        total = self._repository.chunk_count(dataset_version) or 0
        done = self._repository.embedding_count(dataset_version, embedding_version) or 0
        return max(total - done, 0)
