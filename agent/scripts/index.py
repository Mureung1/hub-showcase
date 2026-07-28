r"""원문을 검색 표현으로 만든다.

실행:
    cd agent
    .\.venv\Scripts\Activate.ps1
    python scripts/index.py

청크만 만들고 임베딩은 건너뛴다:
    python scripts/index.py --no-embedding

두 단계 모두 증분이다. 이미 나눈 스냅샷과 이미 임베딩이 있는 청크는 건너뛴다.
스냅샷은 변경되지 않으므로 다시 나눌 이유가 없고, 임베딩은 모델을 바꿀 때
`--embedding-version` 을 올려 다시 채운다.

정의는 docs/knowledge-schema.md 4장이다.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

try:
    from dotenv import load_dotenv
except ImportError:
    print("python-dotenv 가 필요하다. pip install -r requirements.txt")
    raise SystemExit(1)

load_dotenv(ROOT / ".env")

from careersignal.agents.collector import SourceManifest  # noqa: E402
from careersignal.domain.permissions import Component  # noqa: E402
from careersignal.pipelines.chunking import ChunkIndexer  # noqa: E402
from careersignal.pipelines.embedding import EmbeddingIndexer  # noqa: E402
from careersignal.providers.embeddings import OpenAIEmbeddingClient  # noqa: E402
from careersignal.repositories.base import unit_of_work  # noqa: E402
from careersignal.repositories.indexing import IndexRepository  # noqa: E402

DEFAULT_MANIFEST = ROOT / "data" / "manifest" / "backend.json"
DEFAULT_EMBEDDING_VERSION = "emb_v1"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="원문을 청크와 임베딩으로 만든다")
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--embedding-version", default=DEFAULT_EMBEDDING_VERSION)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument(
        "--no-embedding",
        action="store_true",
        help="청크만 만들고 임베딩을 건너뛴다. 생성 모델을 호출하지 않는다",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    manifest = SourceManifest.load(args.manifest)
    dataset_version = manifest.dataset_version

    print(f"데이터셋      {dataset_version}")

    with unit_of_work(Component.PIPE_INDEX) as unit:
        repository = IndexRepository(unit)
        chunked = ChunkIndexer(repository).run(dataset_version)

        print("\n섹션 분할")
        print(f"  새 스냅샷   {chunked.indexed_snapshots}건")
        print(f"  건너뜀      {chunked.skipped_snapshots}건")
        print(f"  새 청크     {chunked.created_chunks}개")
        print(f"  전체 청크   {repository.chunk_count(dataset_version)}개")
        if chunked.empty:
            print(f"  본문 없음   {len(chunked.empty)}건")

        if args.no_embedding:
            return 0

        embedded = EmbeddingIndexer(repository, OpenAIEmbeddingClient()).run(
            dataset_version=dataset_version,
            embedding_version=args.embedding_version,
            batch_size=args.batch_size,
        )

    print("\n임베딩")
    print(f"  버전        {args.embedding_version}")
    print(f"  채움        {embedded.embedded}개")
    print(f"  남음        {embedded.remaining}개")
    if embedded.failed:
        print("  실패")
        for chunk_id, reason in embedded.failed[:10]:
            print(f"    {chunk_id}  {reason}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
