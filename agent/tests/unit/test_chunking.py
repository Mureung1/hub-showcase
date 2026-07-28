"""섹션 분할과 문맥 생성 검증.

섹션을 남기는 이유는 필수와 우대가 구간 라벨로만 갈리기 때문이다.
정의는 docs/knowledge-schema.md 4장이다.
"""

from __future__ import annotations

from typing import Any

from careersignal.pipelines import ChunkIndexer, chunk_identifier, split_sections
from careersignal.pipelines.chunking import (
    build_context,
    build_embedding_text,
    looks_like_header,
    split_long,
    token_estimate,
)

POSTING = """백엔드 개발자

담당업무
서버 애플리케이션 설계 및 개발
REST API 설계

자격요건
Java 또는 Kotlin 경력 3년 이상
RDBMS 사용 경험

우대사항
Kafka 운영 경험이 있으신 분
"""


class FakeIndex:
    """검색 표현 저장소의 대역."""

    def __init__(self, rows: list[dict[str, Any]] | None = None) -> None:
        self.chunks: list[dict[str, Any]] = []
        self._rows = rows or []
        self.done: set[str] = set()

    def add_chunk(self, values: dict[str, Any]) -> None:
        self.chunks.append(values)

    def chunked_snapshots(self, dataset_version: str) -> set[str]:
        return set(self.done)

    def snapshots_to_index(self, dataset_version: str) -> list[dict[str, Any]]:
        return list(self._rows)


def _row(snapshot_id: str = "snap_1", raw: str = POSTING) -> dict[str, Any]:
    return {
        "snapshot_id": snapshot_id,
        "raw_content": raw,
        "source_id": "src_one",
        "source_type": "job_posting",
        "publisher": "예시 회사",
        "company_id": "co_one",
        "job_role_ids": ["backend"],
        "published_at": None,
    }


# ============================================================ 구간 판정
def test_a_short_line_without_a_sentence_end_is_a_header() -> None:
    assert looks_like_header("자격요건")


def test_a_sentence_is_not_a_header() -> None:
    assert not looks_like_header("서버 애플리케이션을 설계하고 개발합니다.")


def test_a_marked_line_is_a_header_even_when_long() -> None:
    assert looks_like_header("### 이런 분과 함께 일하고 싶어요 그리고 더 긴 제목이 이어집니다")


# ============================================================ 섹션 분할
def test_sections_keep_their_titles() -> None:
    titles = [s.title for s in split_sections(POSTING)]

    assert "담당업무" in titles
    assert "자격요건" in titles
    assert "우대사항" in titles


def test_a_required_line_stays_under_its_section() -> None:
    """이 구분이 사라지면 지원 자격과 우대 사항을 가르지 못한다."""
    sections = {s.title: s.text for s in split_sections(POSTING)}

    assert "3년 이상" in sections["자격요건"]
    assert "Kafka" in sections["우대사항"]


def test_an_empty_document_makes_no_section() -> None:
    assert split_sections("") == ()


# ============================================================ 길이
def test_a_short_body_is_not_split() -> None:
    assert split_long("한 줄", limit=100) == ("한 줄",)


def test_a_long_body_is_split_at_line_boundaries() -> None:
    text = "\n".join("가" * 50 for _ in range(10))

    parts = split_long(text, limit=120)

    assert len(parts) > 1
    assert "".join(p.replace("\n", "") for p in parts) == text.replace("\n", "")


def test_the_token_count_is_an_estimate_above_zero() -> None:
    assert token_estimate("") == 1
    assert token_estimate("가" * 220) > 50


# ============================================================ 문맥
def test_the_context_carries_the_metadata() -> None:
    context = build_context(_row(), "자격요건")

    assert context["company_id"] == "co_one"
    assert context["section"] == "자격요건"
    assert context["job_role_ids"] == ["backend"]


def test_the_embedding_text_starts_with_the_context() -> None:
    context = build_context(_row(), "자격요건")

    text = build_embedding_text(context, "Java 경력 3년 이상")

    assert text.startswith("예시 회사 · job_posting · 자격요건")
    assert "Java 경력 3년 이상" in text


# ============================================================ 식별자와 실행
def test_the_same_place_gives_the_same_chunk() -> None:
    assert chunk_identifier("snap_1", 0) == chunk_identifier("snap_1", 0)
    assert chunk_identifier("snap_1", 0) != chunk_identifier("snap_1", 1)


def test_a_snapshot_becomes_several_chunks() -> None:
    store = FakeIndex([_row()])

    outcome = ChunkIndexer(store).run("ds_test")

    assert outcome.indexed_snapshots == 1
    assert outcome.created_chunks == len(store.chunks) >= 3
    assert [c["ordinal"] for c in store.chunks] == list(range(len(store.chunks)))


def test_an_already_chunked_snapshot_is_skipped() -> None:
    """스냅샷은 변경되지 않으므로 다시 나눌 이유가 없다."""
    store = FakeIndex([_row()])
    store.done = {"snap_1"}

    outcome = ChunkIndexer(store).run("ds_test")

    assert outcome.created_chunks == 0
    assert outcome.skipped_snapshots == 1


def test_a_snapshot_without_a_body_is_reported() -> None:
    store = FakeIndex([_row(raw="   ")])

    outcome = ChunkIndexer(store).run("ds_test")

    assert outcome.created_chunks == 0
    assert outcome.empty == ("snap_1",)


def test_running_twice_on_the_same_store_adds_nothing() -> None:
    store = FakeIndex([_row()])
    indexer = ChunkIndexer(store)
    indexer.run("ds_test")
    store.done = {c["snapshot_id"] for c in store.chunks}
    before = len(store.chunks)

    indexer.run("ds_test")

    assert len(store.chunks) == before
