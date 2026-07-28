"""요구 표현 추출과 근거 구간 검증.

`raw_expression` 은 청크 본문의 부분 문자열이고 자리를 오프셋으로 고정한다.
정의는 docs/knowledge-schema.md 5장과 docs/erd.md 6.1이다.
"""

from __future__ import annotations

from datetime import date
from typing import Any

import pytest

from careersignal.agents.statistics import (
    EXHAUSTED,
    NOT_FOUND,
    ExtractionOutcome,
    MentionCandidate,
    MentionCollector,
    SpanResolver,
    StubMentionExtractor,
    mention_identifier,
    quoted,
)
from careersignal.contracts import Budget, RunContext, StopReason
from careersignal.domain.scope import ScopeLevel

CHUNK = """- Java 또는 Kotlin 경력 3년 이상
- RDBMS 사용 경험
- Kafka 운영 경험"""


class FakeStats:
    """통계 저장소의 대역."""

    def __init__(self, rows: list[dict[str, Any]] | None = None) -> None:
        self.mentions: list[dict[str, Any]] = []
        self._rows = rows or []
        self.done: set[str] = set()

    def chunks_to_extract(
        self, dataset_version: str, job_role_id: str, limit: int | None = None
    ) -> list[dict[str, Any]]:
        return list(self._rows if limit is None else self._rows[:limit])

    def extracted_chunks(self, dataset_version: str) -> set[str]:
        return set(self.done)

    def add_mention(self, values: dict[str, Any]) -> None:
        self.mentions.append(values)


class Exploding:
    """예외를 던지는 추출 구현. 구현 결함과 근거 없음을 가른다."""

    def extract(self, section: str | None, text: str) -> tuple[MentionCandidate, ...]:
        raise RuntimeError("모델 응답을 읽지 못했다")


class Inventing:
    """원문에 없는 표현을 돌려주는 추출 구현."""

    def extract(self, section: str | None, text: str) -> tuple[MentionCandidate, ...]:
        return (
            MentionCandidate(
                raw_expression="관계형 데이터베이스 활용 능력",
                stated_requiredness=section or "",
            ),
        )


def _chunk(chunk_id: str = "chunk_1", text: str = CHUNK) -> dict[str, Any]:
    return {
        "chunk_id": chunk_id,
        "snapshot_id": "snap_1",
        "posting_version_id": "pv_1",
        "section": "자격요건",
        "text": text,
    }


def _context(max_tool_calls: int = 40) -> RunContext:
    return RunContext(
        agent_run_id="run_extract_test",
        analysis_version="an_extract_test",
        dataset_version="ds_test",
        job_role_id="backend",
        scope_level=ScopeLevel.OVERALL,
        as_of_date=date(2026, 7, 27),
        budget=Budget(max_tool_calls=max_tool_calls),
    )


# ============================================================ 근거 구간
def test_a_span_points_at_the_original_text() -> None:
    resolver = SpanResolver(CHUNK)

    span = resolver.resolve("RDBMS 사용 경험")

    assert span is not None
    assert quoted(CHUNK, span) == "RDBMS 사용 경험"


def test_an_expression_absent_from_the_text_has_no_span() -> None:
    """지어낸 위치를 넣지 않는다."""
    assert SpanResolver(CHUNK).resolve("관계형 데이터베이스 활용 능력") is None


def test_whitespace_differences_still_resolve() -> None:
    """모델이 줄바꿈을 공백으로 바꿔 돌려주는 경우가 잦다."""
    text = "Java 또는\nKotlin 경력"

    span = SpanResolver(text).resolve("Java 또는 Kotlin 경력")

    assert span is not None
    assert quoted(text, span) == text


def test_a_repeated_expression_gets_successive_places() -> None:
    """두 mention 이 같은 구간을 가리키면 뒤의 것이 앞의 근거를 덮는다."""
    text = "Kafka 경험\n다른 줄\nKafka 경험"
    resolver = SpanResolver(text)

    first = resolver.resolve("Kafka 경험")
    second = resolver.resolve("Kafka 경험")

    assert first is not None and second is not None
    assert first.start < second.start


def test_asking_more_times_than_it_appears_gives_nothing() -> None:
    resolver = SpanResolver("Kafka 경험")
    resolver.resolve("Kafka 경험")

    assert resolver.resolve("Kafka 경험") is None
    assert resolver.reason("Kafka 경험") == EXHAUSTED


def test_the_reason_separates_absence_from_exhaustion() -> None:
    resolver = SpanResolver(CHUNK)

    assert resolver.reason("관계형 데이터베이스 활용 능력") == NOT_FOUND


def test_an_empty_expression_has_no_span() -> None:
    assert SpanResolver(CHUNK).resolve("   ") is None


# ============================================================ 식별자
def test_the_same_place_gives_the_same_mention() -> None:
    assert mention_identifier("chunk_1", "pv_1", 0, 10) == mention_identifier(
        "chunk_1", "pv_1", 0, 10
    )


def test_a_different_place_gives_a_different_mention() -> None:
    assert mention_identifier("chunk_1", "pv_1", 0, 10) != mention_identifier(
        "chunk_1", "pv_1", 5, 15
    )


def test_the_same_chunk_in_two_postings_gives_two_mentions() -> None:
    """한 출처가 모집분야를 여럿 담으면 청크가 공고마다 근거가 된다."""
    assert mention_identifier("chunk_1", "pv_1", 0, 10) != mention_identifier(
        "chunk_1", "pv_2", 0, 10
    )


# ============================================================ 실행
def test_extraction_stores_a_mention_for_each_expression() -> None:
    store = FakeStats([_chunk()])

    outcome = MentionCollector(StubMentionExtractor(), store).run(_context())

    assert outcome.created_mentions == 3
    assert outcome.stop_reason is StopReason.SLOTS_FILLED
    assert all(m["posting_version_id"] == "pv_1" for m in store.mentions)


def test_a_stored_expression_matches_its_span() -> None:
    """검증의 근거 위치 검사가 이 둘을 대조한다."""
    store = FakeStats([_chunk()])
    MentionCollector(StubMentionExtractor(), store).run(_context())

    for m in store.mentions:
        start, end = m["evidence_span_start"], m["evidence_span_end"]
        assert CHUNK[start:end] == m["raw_expression"]
        assert start < end


def test_the_section_label_is_carried_as_written() -> None:
    """필수와 우대의 판정은 할당 단계의 몫이며 여기서 해석하지 않는다."""
    store = FakeStats([_chunk()])
    MentionCollector(StubMentionExtractor(), store).run(_context())

    assert {m["stated_requiredness"] for m in store.mentions} == {"자격요건"}
    assert {m["section"] for m in store.mentions} == {"자격요건"}


def test_an_invented_expression_is_discarded_with_a_reason() -> None:
    store = FakeStats([_chunk()])

    outcome = MentionCollector(Inventing(), store).run(_context())

    assert store.mentions == []
    assert outcome.created_mentions == 0
    assert outcome.discarded[0][2] == NOT_FOUND
    assert outcome.stop_reason is StopReason.NO_NEW_EVIDENCE


def test_an_already_extracted_chunk_is_skipped() -> None:
    store = FakeStats([_chunk()])
    store.done = {"chunk_1"}

    outcome = MentionCollector(StubMentionExtractor(), store).run(_context())

    assert outcome.created_mentions == 0
    assert outcome.skipped_chunks == 1


def test_a_broken_extractor_stops_with_explicit_failure() -> None:
    """구현 결함을 근거 없음으로 보지 않는다."""
    store = FakeStats([_chunk()])

    outcome = MentionCollector(Exploding(), store).run(_context())

    assert outcome.stop_reason is StopReason.EXPLICIT_FAILURE
    assert outcome.errors[0][0] == "chunk_1"


def test_no_chunk_stops_with_frontier_exhausted() -> None:
    outcome = MentionCollector(StubMentionExtractor(), FakeStats([])).run(_context())

    assert outcome.stop_reason is StopReason.FRONTIER_EXHAUSTED


def test_the_budget_stops_the_run() -> None:
    store = FakeStats([_chunk("chunk_1"), _chunk("chunk_2"), _chunk("chunk_3")])

    outcome = MentionCollector(StubMentionExtractor(), store).run(_context(max_tool_calls=2))

    assert outcome.visited_chunks == 2
    assert outcome.stop_reason is StopReason.BUDGET_EXHAUSTED


def test_running_twice_creates_the_same_identifiers() -> None:
    """다시 뽑아도 같은 자리는 같은 mention 이다."""
    first = FakeStats([_chunk()])
    second = FakeStats([_chunk()])
    MentionCollector(StubMentionExtractor(), first).run(_context())
    MentionCollector(StubMentionExtractor(), second).run(_context())

    assert [m["mention_id"] for m in first.mentions] == [
        m["mention_id"] for m in second.mentions
    ]


def test_the_outcome_reports_evidence() -> None:
    store = FakeStats([_chunk()])

    outcome: ExtractionOutcome = MentionCollector(StubMentionExtractor(), store).run(
        _context()
    )

    assert outcome.gained_evidence
    assert outcome.agent_run_id == "run_extract_test"


@pytest.mark.parametrize("column", [
    "mention_id", "posting_version_id", "snapshot_id", "chunk_id", "raw_expression",
    "evidence_span_start", "evidence_span_end", "stated_requiredness",
    "extraction_run_id", "dataset_version",
])
def test_every_not_null_column_is_filled(column: str) -> None:
    store = FakeStats([_chunk()])
    MentionCollector(StubMentionExtractor(), store).run(_context())

    assert store.mentions[0][column] is not None
