"""검색 표현 저장소.

청크와 임베딩은 적재 인덱싱 파이프라인만 쓴다. 근거는 docs/permission-matrix.md 3장이다.
정의는 docs/knowledge-schema.md 4장이다.
"""

from __future__ import annotations

import json
from typing import Any

from careersignal.domain.permissions import Component
from careersignal.repositories.base import Repository


class IndexRepository(Repository):
    component = Component.PIPE_INDEX

    # ------------------------------------------------------------ 청크
    def add_chunk(self, values: dict[str, Any]) -> None:
        row = dict(values)
        row["context"] = json.dumps(row["context"], ensure_ascii=False)
        self.unit.insert("source_chunks", row)

    def chunked_snapshots(self, dataset_version: str) -> set[str]:
        """이미 청크를 만든 스냅샷. 증분 재실행이 여기서 갈린다."""
        rows = self.unit.fetch_all(
            "SELECT DISTINCT snapshot_id FROM source_chunks WHERE dataset_version = %s",
            (dataset_version,),
        )
        return {r["snapshot_id"] for r in rows}

    def snapshots_to_index(self, dataset_version: str) -> list[dict[str, Any]]:
        """청크로 만들 스냅샷과 그 원문.

        출처의 종류와 회사를 함께 돌려준다. 문맥을 결정적으로 만들려면 이 값이 필요하다.
        """
        return self.unit.fetch_all(
            """
            SELECT s.snapshot_id, s.raw_content, s.published_at,
                   o.source_id, o.source_type, o.publisher, o.company_id, o.job_role_ids
            FROM source_snapshots s
            JOIN sources o ON o.source_id = s.source_id
            WHERE s.dataset_version = %s
            ORDER BY s.source_id, s.snapshot_id
            """,
            (dataset_version,),
        )

    def chunk_count(self, dataset_version: str) -> int:
        return self.unit.fetch_value(
            "SELECT count(*) FROM source_chunks WHERE dataset_version = %s",
            (dataset_version,),
        )

    # ------------------------------------------------------------ 임베딩
    def chunks_without_embedding(
        self, dataset_version: str, embedding_version: str, limit: int = 500
    ) -> list[dict[str, Any]]:
        """임베딩이 없는 청크. 모델을 바꾸면 새 버전으로 다시 채운다."""
        return self.unit.fetch_all(
            """
            SELECT c.chunk_id, c.embedding_text
            FROM source_chunks c
            LEFT JOIN chunk_embeddings e
              ON e.chunk_id = c.chunk_id AND e.embedding_version = %s
            WHERE c.dataset_version = %s AND e.chunk_id IS NULL
            ORDER BY c.chunk_id
            LIMIT %s
            """,
            (embedding_version, dataset_version, limit),
        )

    def add_embedding(
        self,
        chunk_id: str,
        embedding: list[float],
        embedding_model: str,
        embedding_version: str,
    ) -> None:
        self.unit.insert(
            "chunk_embeddings",
            {
                "chunk_id": chunk_id,
                "embedding_model": embedding_model,
                "embedding_dimension": len(embedding),
                "embedding": "[" + ",".join(repr(float(v)) for v in embedding) + "]",
                "embedding_version": embedding_version,
            },
        )

    def embedding_count(self, dataset_version: str, embedding_version: str) -> int:
        return self.unit.fetch_value(
            """
            SELECT count(*) FROM chunk_embeddings e
            JOIN source_chunks c ON c.chunk_id = e.chunk_id
            WHERE c.dataset_version = %s AND e.embedding_version = %s
            """,
            (dataset_version, embedding_version),
        )

    # ------------------------------------------------------------ 검색
    def keyword_search(
        self, dataset_version: str, query: str, limit: int = 50
    ) -> list[dict[str, Any]]:
        """생성된 `tsv` 열로 찾는다. 점수는 `ts_rank_cd` 다."""
        return self.unit.fetch_all(
            """
            SELECT c.chunk_id, c.snapshot_id, c.section, c.text,
                   ts_rank_cd(c.tsv, plainto_tsquery('simple', %s)) AS score
            FROM source_chunks c
            WHERE c.dataset_version = %s
              AND c.tsv @@ plainto_tsquery('simple', %s)
            ORDER BY score DESC, c.chunk_id
            LIMIT %s
            """,
            (query, dataset_version, query, limit),
        )

    def vector_search(
        self,
        dataset_version: str,
        embedding: list[float],
        embedding_version: str,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        """코사인 거리로 찾는다. 점수는 1에서 거리를 뺀 값이다."""
        literal = "[" + ",".join(repr(float(v)) for v in embedding) + "]"
        return self.unit.fetch_all(
            """
            SELECT c.chunk_id, c.snapshot_id, c.section, c.text,
                   1 - (e.embedding <=> %s::vector) AS score
            FROM chunk_embeddings e
            JOIN source_chunks c ON c.chunk_id = e.chunk_id
            WHERE c.dataset_version = %s AND e.embedding_version = %s
            ORDER BY e.embedding <=> %s::vector, c.chunk_id
            LIMIT %s
            """,
            (literal, dataset_version, embedding_version, literal, limit),
        )
