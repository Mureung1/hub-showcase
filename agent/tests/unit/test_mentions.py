"""요구 표현 추출과 근거 구간 검증.

`raw_expression` 은 청크 본문의 부분 문자열이고 자리를 오프셋으로 고정한다.
정의는 docs/knowledge-schema.md 5장과 docs/erd.md 6.1이다.
"""

from __future__ import annotations

import threading
import time
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
from careersignal.domain.permissions import Component
from careersignal.domain.scope import ScopeLevel
from careersignal.repositories.statistics import StatisticsRepository

CHUNK = """- Java 또는 Kotlin 경력 3년 이상
- RDBMS 사용 경험
- Kafka 운영 경험"""


class FakeStats:
    """통계 저장소의 대역."""

    def __init__(self, rows: list[dict[str, Any]] | None = None) -> None:
        self.mentions: list[dict[str, Any]] = []
        self._rows = rows or []
        self.done: set[str] = set()
        self.raced: set[str] = set()
        """이 실행의 조회 밖에서 다른 실행이 뽑아 둔 청크.

        조회가 거르지 못하는 자리이며 파이썬의 건너뛰기가 잡는다.
        """

        self.writing_threads: set[str] = set()
        """쓰기를 부른 갈래 이름. 저장소 연결은 스레드 안전하지 않다.

        동시 실행이 모델만 겹쳐 부르고 저장은 주 갈래에서 하는지 검사한다.
        """

    def chunks_to_extract(
        self, dataset_version: str, job_role_id: str, limit: int | None = None
    ) -> list[dict[str, Any]]:
        """이미 뽑은 청크를 뺀 뒤 자른다.

        차례가 `_POSTING_CHUNKS` 와 같다. 자르고 나서 빼면 `--limit` 이 이미 뽑은
        청크로 채워져 재실행이 앞으로 나아가지 못한다.
        """
        rows = [row for row in self._rows if row["chunk_id"] not in self.done]
        return list(rows if limit is None else rows[:limit])

    def extracted_chunks(self, dataset_version: str) -> set[str]:
        return self.done | self.raced

    def add_mention(self, values: dict[str, Any]) -> None:
        self.writing_threads.add(threading.current_thread().name)
        self.mentions.append(values)


class Exploding:
    """예외를 던지는 추출 구현. 구현 결함과 근거 없음을 가른다."""

    def extract(self, section: str | None, text: str) -> tuple[MentionCandidate, ...]:
        raise RuntimeError("모델 응답을 읽지 못했다")


class Slow:
    """호출마다 다른 시간을 기다리는 추출 구현.

    먼저 보낸 청크가 더 오래 기다리므로 도착 순서가 보낸 순서와 뒤집힌다. 결과를
    도착 순서로 저장하는 구현이면 이 대역에서 mention 순서가 어긋난다.
    """

    def __init__(self) -> None:
        self._stub = StubMentionExtractor()
        self._lock = threading.Lock()
        self.calls = 0

    def extract(self, section: str | None, text: str) -> tuple[MentionCandidate, ...]:
        with self._lock:
            self.calls += 1
            order = self.calls
        time.sleep(0.02 / order)
        return self._stub.extract(section, text)


class Quota:
    """할당량이 끝난 뒤의 제공자. 되살릴 수 없는 실패를 던진다."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.calls = 0

    def extract(self, section: str | None, text: str) -> tuple[MentionCandidate, ...]:
        with self._lock:
            self.calls += 1
        raise type("AuthenticationError", (Exception,), {})("자격 증명이 틀렸다")


def _unrecoverable(exc: BaseException) -> bool:
    """`taxonomy/assignment.py` 의 판정을 그대로 쓴다. 규칙을 두 벌 두지 않는다."""
    from careersignal.taxonomy.assignment import unrecoverable_exception

    return unrecoverable_exception(exc)


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


def test_an_already_extracted_chunk_is_not_offered_again() -> None:
    """이미 뽑은 청크는 조회가 먼저 뺀다. 건너뛸 것조차 오지 않는다."""
    store = FakeStats([_chunk()])
    store.done = {"chunk_1"}

    outcome = MentionCollector(StubMentionExtractor(), store).run(_context())

    assert outcome.created_mentions == 0
    assert outcome.skipped_chunks == 0
    assert outcome.stop_reason is StopReason.FRONTIER_EXHAUSTED


def test_a_chunk_extracted_by_an_overlapping_run_is_still_skipped() -> None:
    """조회가 거른 뒤에도 파이썬이 다시 확인한다. 두 실행이 겹칠 때의 방어선이다."""
    store = FakeStats([_chunk()])
    store.raced = {"chunk_1"}

    outcome = MentionCollector(StubMentionExtractor(), store).run(_context())

    assert outcome.created_mentions == 0
    assert outcome.skipped_chunks == 1


def test_the_limit_leaves_the_already_extracted_chunks_out() -> None:
    """`--limit` 이 이미 뽑은 청크로 채워지면 재실행이 앞으로 나아가지 못한다."""
    store = FakeStats([_chunk("chunk_1"), _chunk("chunk_2")])
    store.done = {"chunk_1"}

    outcome = MentionCollector(StubMentionExtractor(), store).run(_context(), limit=1)

    assert outcome.visited_chunks == 1
    assert {m["chunk_id"] for m in store.mentions} == {"chunk_2"}


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


# ============================================================ 동시 실행
def _chunks(count: int) -> list[dict[str, Any]]:
    return [_chunk(f"chunk_{index}") for index in range(1, count + 1)]


def test_the_concurrent_run_stores_the_mentions_in_the_chunk_order() -> None:
    """겹쳐 불러도 저장 순서는 청크 순서다. 도착 순서를 쓰지 않는다."""
    serial = FakeStats(_chunks(9))
    concurrent = FakeStats(_chunks(9))

    MentionCollector(Slow(), serial, workers=1).run(_context())
    MentionCollector(Slow(), concurrent, workers=6).run(_context())

    assert [m["mention_id"] for m in serial.mentions] == [
        m["mention_id"] for m in concurrent.mentions
    ]
    assert [m["chunk_id"] for m in concurrent.mentions] == [
        f"chunk_{index}" for index in range(1, 10) for _ in range(3)
    ]


def test_the_repository_is_written_from_one_thread_only() -> None:
    """저장은 주 갈래에서만 한다. 저장소 연결은 스레드 안전하지 않다."""
    store = FakeStats(_chunks(9))

    MentionCollector(Slow(), store, workers=6).run(_context())

    assert store.mentions
    assert store.writing_threads == {threading.current_thread().name}


def test_the_concurrent_run_does_not_exceed_the_budget() -> None:
    """겹쳐 보내도 예산보다 많이 부르지 않는다."""
    store = FakeStats(_chunks(20))
    extractor = Slow()

    outcome = MentionCollector(extractor, store, workers=8).run(
        _context(max_tool_calls=5)
    )

    assert extractor.calls == 5
    assert outcome.visited_chunks == 5
    assert outcome.stop_reason is StopReason.BUDGET_EXHAUSTED


def test_an_unrecoverable_failure_stops_the_remaining_chunks() -> None:
    """되살릴 수 없는 실패를 만나면 남은 청크를 보내지 않는다."""
    store = FakeStats(_chunks(30))
    extractor = Quota()

    outcome = MentionCollector(
        extractor, store, workers=3, stop_when=_unrecoverable
    ).run(_context())

    assert extractor.calls < 30
    assert outcome.visited_chunks == extractor.calls
    assert outcome.stop_reason is StopReason.EXPLICIT_FAILURE


def test_without_the_predicate_every_chunk_is_still_tried() -> None:
    """판정을 넣지 않으면 예전처럼 한 청크의 실패가 나머지를 막지 않는다."""
    store = FakeStats(_chunks(6))
    extractor = Quota()

    outcome = MentionCollector(extractor, store, workers=3).run(_context())

    assert extractor.calls == 6
    assert len(outcome.errors) == 6


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


# ============================================================ 조회 문자열
class RecordingUnit:
    """저장소가 실제로 실행하는 SQL 을 붙잡는 대역. 데이터베이스에 붙지 않는다.

    대역 저장소로는 이 결함을 잡지 못한다. `--limit` 이 자르는 차례는 파이썬이
    아니라 SQL 이 정하고, 단위 시험은 데이터베이스에 붙을 수 없다. 그래서 저장소가
    만들어 낸 조회 문자열을 직접 본다.
    """

    def __init__(self, component: Component) -> None:
        self.component = component
        self.sql = ""
        self.params: dict[str, Any] = {}

    def fetch_all(
        self, sql: str, params: dict[str, Any] | None = None
    ) -> list[dict[str, Any]]:
        self.sql = sql
        self.params = dict(params or {})
        return []


def _recorded_chunk_sql(limit: int | None = 200) -> RecordingUnit:
    unit = RecordingUnit(Component.AGENT_STATS)
    StatisticsRepository(unit).chunks_to_extract("ds_2026_01", "backend", limit)
    return unit


def test_the_extracted_chunks_leave_before_the_limit_cuts() -> None:
    """자르고 나서 걸러 내면 같은 `--limit` 을 다시 줘도 아무것도 진행하지 못한다."""
    unit = _recorded_chunk_sql()

    assert "NOT EXISTS" in unit.sql
    assert unit.sql.index("NOT EXISTS") < unit.sql.index("LIMIT")


def test_the_chunk_exclusion_matches_the_extracted_chunks_rule() -> None:
    """제외 기준이 `extracted_chunks()` 와 같다. 청크 단위이며 같은 데이터셋 버전이다."""
    sql = _recorded_chunk_sql().sql

    assert "FROM requirement_mentions m" in sql
    assert "m.chunk_id = c.chunk_id" in sql
    assert "m.dataset_version = %(dataset_version)s" in sql


def test_the_chunk_order_stays_deterministic() -> None:
    """정렬을 바꾸면 나눠 돌린 실행의 결과를 대조할 수 없다."""
    sql = _recorded_chunk_sql(limit=None).sql

    assert sql.rstrip().endswith("ORDER BY pv.posting_version_id, c.ordinal, c.chunk_id")
