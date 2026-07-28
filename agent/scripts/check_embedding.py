r"""축소 차원이 검색 결과를 바꾸는지 점검한다.

`chunk_embeddings.embedding` 은 `vector(1536)` 인데 `text-embedding-3-large` 의
기본 차원은 3072 다. 축소를 제공자에게 맡기고 있으므로 전체 색인 전에 두 가지를
확인한다.

1. 축소가 동작하는가. 요청한 차원이 그대로 오는가.
2. 축소가 검색 결과를 바꾸는가.

2번이 이 점검의 목적이다. 임베딩의 좋고 나쁨을 사람의 직관으로 판정하지 않고,
같은 문장을 3072 와 1536 으로 각각 임베딩해 **검색 순위가 얼마나 같은지** 본다.
1536 이 3072 와 같은 것을 찾아낸다면 축소는 검색에 쓸 수 있다. 절대 유사도 값이
얼마인지는 묻지 않는다. 검색은 순위만 쓰기 때문이다.

대상은 합성 문장이 아니라 실제로 수집한 공고에서 뽑은 청크다. 문체가 균일한
채용공고에서는 형식적 유사성이 의미적 유사성과 비슷한 크기로 나타나므로, 이
말뭉치 안에서 확인해야 실제 검색과 같은 조건이 된다.

실행:
    cd agent
    .\.venv\Scripts\Activate.ps1
    python scripts/check_embedding.py

문서가 없으면 청크 수를 줄이거나 늘린다:
    python scripts/check_embedding.py --chunks 40
"""

from __future__ import annotations

import argparse
import math
import sys
from dataclasses import replace
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

try:
    from dotenv import load_dotenv
except ImportError:
    print("python-dotenv 가 필요하다. pip install -r requirements.txt")
    raise SystemExit(1)

load_dotenv(ROOT / ".env")

from careersignal.pipelines.chunking import (  # noqa: E402
    MAX_CHARS,
    split_long,
    split_sections,
)
from careersignal.providers.embeddings import OpenAIEmbeddingClient  # noqa: E402
from careersignal.providers.models import EMBEDDING  # noqa: E402

SOURCE_DIR = ROOT / "data" / "sources" / "backend"

QUERIES = (
    "대용량 트래픽을 처리하는 백엔드 시스템 설계 경험",
    "Kubernetes 와 CI/CD 를 이용한 배포 자동화",
    "관계형 데이터베이스 쿼리 성능 최적화",
)
"""검색 질의. 실제 사용자가 물을 만한 요구를 담는다."""

TOP_K = 10
"""상위 몇 개를 비교할지. 검색이 실제로 근거로 쓰는 개수와 같은 자리다."""

PASS_OVERLAP = 0.8
"""통과 기준. 상위 K 개 중 이 비율 이상이 같으면 축소가 검색을 바꾸지 않는다."""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="축소 차원의 검색 순위를 비교한다")
    parser.add_argument("--chunks", type=int, default=60, help="비교에 쓸 청크 수")
    parser.add_argument("--top-k", type=int, default=TOP_K)
    return parser.parse_args()


def sample_chunks(limit: int) -> list[str]:
    """실제 문서에서 청크를 고르게 뽑는다.

    파일 이름 순으로 돌면서 파일마다 하나씩 가져간다. 한 공고의 청크가 몰리면
    비교가 그 공고의 문체에만 좌우된다.

    같은 문자열은 한 번만 쓴다. 채용 사이트의 머리말과 안내문이 여러 문서에
    똑같이 들어 있어, 지우지 않으면 같은 벡터가 여럿이 되어 순위 비교가 동점
    처리만 보게 된다.
    """
    per_file: list[list[str]] = []
    seen: set[str] = set()
    for path in sorted(SOURCE_DIR.glob("*.txt")):
        raw = path.read_text(encoding="utf-8", errors="replace")
        pieces: list[str] = []
        for section in split_sections(raw):
            for piece in split_long(section.text, MAX_CHARS):
                stripped = piece.strip()
                if len(stripped) < 80 or stripped in seen:
                    continue
                seen.add(stripped)
                pieces.append(stripped)
        if pieces:
            per_file.append(pieces)

    chunks: list[str] = []
    depth = 0
    while len(chunks) < limit and any(depth < len(p) for p in per_file):
        for pieces in per_file:
            if depth < len(pieces):
                chunks.append(pieces[depth])
                if len(chunks) == limit:
                    break
        depth += 1
    return chunks


def cosine(left: list[float], right: list[float]) -> float:
    dot = sum(a * b for a, b in zip(left, right, strict=True))
    norm = math.sqrt(sum(a * a for a in left)) * math.sqrt(sum(b * b for b in right))
    return dot / norm if norm else 0.0


def ranking(query: list[float], corpus: list[list[float]], top_k: int) -> list[int]:
    """질의에 가까운 순으로 청크 번호를 돌려준다."""
    scores = [(cosine(query, vector), index) for index, vector in enumerate(corpus)]
    scores.sort(key=lambda pair: (-pair[0], pair[1]))
    return [index for _, index in scores[:top_k]]


def embed_all(dimensions: int, texts: list[str]) -> list[list[float]]:
    config = replace(EMBEDDING, dimensions=dimensions)
    return OpenAIEmbeddingClient(config=config).embed(texts)


def main() -> int:
    args = parse_args()

    if not SOURCE_DIR.exists():
        print(f"원문 폴더가 없다: {SOURCE_DIR}")
        return 1

    chunks = sample_chunks(args.chunks)
    if len(chunks) < args.top_k:
        print(f"청크가 {len(chunks)}개뿐이다. 비교할 수 없다")
        return 1

    texts = list(QUERIES) + chunks
    print(f"모델        {EMBEDDING.model}")
    print(f"비교 차원   {EMBEDDING.native_dimensions} 대 {EMBEDDING.dimensions}")
    print(f"청크        {len(chunks)}개 · 질의 {len(QUERIES)}개")
    print(f"호출        문자열 {len(texts)}개 x 2회")

    try:
        native = embed_all(EMBEDDING.native_dimensions, texts)
        reduced = embed_all(EMBEDDING.dimensions, texts)
    except Exception as error:  # noqa: BLE001
        print(f"\n실패      {type(error).__name__}: {error}")
        return 1

    print(f"\n받은 차원   {len(native[0])} / {len(reduced[0])}")
    if len(reduced[0]) != EMBEDDING.dimensions:
        print("축소가 동작하지 않았다. 차원이 설정과 다르다")
        return 1

    offset = len(QUERIES)
    print(f"\n상위 {args.top_k}개 검색 결과 비교")
    overlaps: list[float] = []
    for index, query in enumerate(QUERIES):
        native_rank = ranking(native[index], native[offset:], args.top_k)
        reduced_rank = ranking(reduced[index], reduced[offset:], args.top_k)
        shared = len(set(native_rank) & set(reduced_rank))
        overlap = shared / args.top_k
        overlaps.append(overlap)
        same_first = "같음" if native_rank[0] == reduced_rank[0] else "다름"
        print(f"  겹침 {shared}/{args.top_k}  1위 {same_first}  | {query}")

    average = sum(overlaps) / len(overlaps)
    print(f"\n평균 겹침   {average:.0%}")

    if average >= PASS_OVERLAP:
        print(f"판정        통과. 기준 {PASS_OVERLAP:.0%} 이상")
        print("            축소한 벡터가 3072 와 같은 것을 찾는다. 전체 색인을 진행해도 된다.")
        return 0

    print(f"판정        실패. 기준 {PASS_OVERLAP:.0%} 미만")
    print("            축소 차원을 올리고 `chunk_embeddings.embedding` 정의를 함께 바꾼다.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
