"""요구 표현 추출의 실행 골격.

정의는 docs/agent-design.md 6장·7.3, docs/knowledge-schema.md 5장을 따른다.

청크를 모델에 주고 돌아온 표현의 자리를 원문에서 확정해 mention 으로 남긴다.
분류체계와 무관하게 표현을 먼저 확보한다. 분류체계가 확정되기 전에도 원문 근거는
모을 수 있으며, 새 표현을 기존 분류에 강제로 넣지 않는다.

`raw_expression` 은 청크 본문의 부분 문자열이고 자리는 `evidence_span_start` 와
`evidence_span_end` 로 고정한다. 자리를 정하지 못한 표현은 저장하지 않는다.

모델 호출은 여러 청크를 겹쳐 보내고 저장은 주 갈래에서 입력 순서대로 한다. 근거는
`providers/concurrency.py` 다. 저장소는 psycopg 연결 하나를 감싸며 스레드 안전하지
않으므로 다른 갈래에서 쓰지 않는다.
"""

from __future__ import annotations

import hashlib
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

from careersignal.agents.statistics.extractor import MentionExtractor
from careersignal.agents.statistics.spans import SpanResolver, quoted
from careersignal.contracts.run_context import RunContext, StopReason
from careersignal.providers.concurrency import DEFAULT_WORKERS, map_ordered
from careersignal.repositories.statistics import StatisticsRepository


def mention_identifier(chunk_id: str, posting_version_id: str, start: int, end: int) -> str:
    """같은 청크의 같은 자리는 같은 mention 이다.

    추출을 다시 돌려도 같은 표현이 같은 식별자를 받는다.
    """
    material = f"{chunk_id}:{posting_version_id}:{start}:{end}".encode()
    return f"mention_{hashlib.sha256(material).hexdigest()[:24]}"


@dataclass(frozen=True, slots=True)
class ExtractionOutcome:
    """추출 실행 하나의 결과."""

    agent_run_id: str
    stop_reason: StopReason
    visited_chunks: int = 0
    skipped_chunks: int = 0
    created_mentions: int = 0
    discarded: tuple[tuple[str, str, str], ...] = field(default_factory=tuple)
    """자리를 정하지 못해 버린 표현. `(청크, 표현, 사유)` 다."""

    errors: tuple[tuple[str, str], ...] = field(default_factory=tuple)
    """추출 구현이 던진 예외. 수집 실패와 구분한다."""

    @property
    def gained_evidence(self) -> bool:
        return self.created_mentions > 0


class MentionCollector:
    """청크에서 요구 표현을 뽑아 저장한다."""

    def __init__(
        self,
        extractor: MentionExtractor,
        repository: StatisticsRepository,
        workers: int = DEFAULT_WORKERS,
        stop_when: Callable[[BaseException], bool] | None = None,
    ) -> None:
        """`workers` 는 동시에 보낼 모델 요청 수다. 1 이면 하나씩 부른다.

        `stop_when` 은 되살릴 수 없는 실패를 가르는 판정이다. 참이면 아직 보내지
        않은 청크를 더 보내지 않는다. 판정 자체는 `taxonomy/assignment.py` 의
        `unrecoverable_exception` 이 갖고 있으며, 이 모듈이 그것을 import 하면
        `taxonomy` → `agents` 방향의 기존 의존과 순환이 되므로 실행 스크립트가
        넣어 준다.
        """
        self._extractor = extractor
        self._repository = repository
        self._workers = workers
        self._stop_when = stop_when

    def run(self, context: RunContext, limit: int | None = None) -> ExtractionOutcome:
        """청크를 소진하거나 예산이 끝날 때까지 뽑는다.

        한 청크의 실패가 나머지를 막지 않는다. 이미 뽑은 청크는 건너뛴다. 청크는
        스냅샷에서 결정적으로 나오고 스냅샷은 변경되지 않으므로 다시 뽑을 이유가 없다.

        모델 호출만 겹친다. 예산만큼 잘라 낸 청크를 한꺼번에 보내고, 돌아온 결과를
        **입력 순서대로** 하나씩 저장한다. 저장이 주 갈래에서만 일어나므로 저장소
        연결을 여러 갈래가 함께 쓰지 않고, `mention_identifier` 가 기대는 순서도
        흔들리지 않는다.
        """
        done = self._repository.extracted_chunks(context.dataset_version)
        rows = self._repository.chunks_to_extract(
            context.dataset_version, context.job_role_id, limit
        )

        pending = [row for row in rows if row["chunk_id"] not in done]
        skipped = len(rows) - len(pending)

        # 예산을 넘겨 부르지 않는다. 보내기 전에 잘라야 동시 실행이 한도를 넘지 않는다.
        budget_exhausted = len(pending) > context.budget.max_tool_calls
        pending = pending[: context.budget.max_tool_calls]

        created = 0
        discarded: list[tuple[str, str, str]] = []
        errors: list[tuple[str, str]] = []

        results = map_ordered(
            lambda row: self._extractor.extract(row["section"], row["text"]),
            pending,
            self._workers,
            self._stop_when,
        )
        # 시도한 청크만 셌다. 멈춘 뒤 보내지 않은 청크는 저장소에 자국이 없으므로
        # 다음 실행이 같은 자리에서 다시 집는다.
        visited = len(results)

        for record in results:
            row = record.item
            if record.error is not None:
                error = record.error
                errors.append(
                    (row["chunk_id"], f"{type(error).__name__}: {error}")
                )
                continue

            resolver = SpanResolver(row["text"])
            for candidate in record.value or ():
                span = resolver.resolve(candidate.raw_expression)
                if span is None:
                    discarded.append(
                        (
                            row["chunk_id"],
                            candidate.raw_expression,
                            resolver.reason(candidate.raw_expression),
                        )
                    )
                    continue
                self._repository.add_mention(
                    self._row(context, row, candidate, span)
                )
                created += 1

        return ExtractionOutcome(
            agent_run_id=context.agent_run_id,
            stop_reason=_stop_reason(
                rows=rows,
                visited=visited,
                created=created,
                errors=bool(errors),
                budget_exhausted=budget_exhausted,
            ),
            visited_chunks=visited,
            skipped_chunks=skipped,
            created_mentions=created,
            discarded=tuple(discarded),
            errors=tuple(errors),
        )

    def _row(
        self, context: RunContext, chunk: dict[str, Any], candidate: Any, span: Any
    ) -> dict[str, Any]:
        """저장할 mention 한 줄.

        `raw_expression` 에 모델이 준 문자열이 아니라 구간이 가리키는 원문을 넣는다.
        둘이 공백만 다를 수 있으며, 저장되는 값은 원문과 글자까지 같아야 한다.
        """
        return {
            "mention_id": mention_identifier(
                chunk["chunk_id"], chunk["posting_version_id"], span.start, span.end
            ),
            "posting_version_id": chunk["posting_version_id"],
            "snapshot_id": chunk["snapshot_id"],
            "chunk_id": chunk["chunk_id"],
            "raw_expression": quoted(chunk["text"], span),
            "evidence_span_start": span.start,
            "evidence_span_end": span.end,
            "stated_requiredness": candidate.stated_requiredness,
            "section": chunk["section"],
            "extraction_confidence": candidate.confidence,
            "extraction_run_id": context.agent_run_id,
            "dataset_version": context.dataset_version,
        }


def _stop_reason(
    rows: list[dict[str, Any]],
    visited: int,
    created: int,
    errors: bool,
    budget_exhausted: bool,
) -> StopReason:
    """docs/agent-design.md 11.1의 종료 조건을 판정한다.

    순서가 의미를 갖는다. 예산이 끝나 청크를 남긴 실행을 전수 조사로 볼 수 없고,
    추출 구현이 깨진 실행을 근거 없음으로 볼 수 없다.
    """
    if budget_exhausted:
        return StopReason.BUDGET_EXHAUSTED
    if errors:
        return StopReason.EXPLICIT_FAILURE
    if not rows:
        return StopReason.FRONTIER_EXHAUSTED
    if created:
        return StopReason.SLOTS_FILLED
    return StopReason.NO_NEW_EVIDENCE
