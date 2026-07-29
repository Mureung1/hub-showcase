"""합격 전략의 실행 골격.

정의는 docs/agent-design.md 6장·7.5·11.3, docs/erd.md 11.3·11.7,
`agent/data/demo_seed/CONTRACT.md` 5장 C 를 따른다.

해석 산출물을 받아 체크리스트 초안을 세우고(규칙), 초안마다 문구를 받아(모델),
개념과 버전 인스턴스로 나눠 저장하고, 화면이 그대로 소비하는 payload 를 만든다.

세 가지가 이 골격의 계약이다.

- **개념은 문구보다 오래 산다.** `checklist_concepts` 는 분석 버전을 담지 않고
  `checklist_items` 가 버전별 문구를 갖는다. payload 의 `checklist[].item_id` 는
  **개념 식별자**이며, 화면 체크 상태와 로드맵의 `fills[].item_id` 가 이 키에
  기댄다. 여기서 항목 식별자를 내보내면 문구 개정 한 번에 사용자 체크가 전부
  풀린다.
- **근거 없는 항목은 저장하지 않는다.** 연결 완전성과 자료 정책 검사에 걸린 항목은
  개념도 인스턴스도 만들지 않고 `rejected` 로 보고한다. 걸린 항목을 빼고 나머지를
  저장하는 것이 실행 전체를 버리는 것보다 낫다. 항목 하나의 근거가 빈 것이 나머지
  항목의 근거를 무르게 하지 않는다.
- **모델 호출만 겹친다.** `providers/concurrency.map_ordered` 로 문구를 한꺼번에
  받고, 저장은 주 갈래에서 입력 순서대로 한다. 저장소는 psycopg 연결 하나를 감싸며
  스레드 안전하지 않다.

이 모듈은 저장소를 `Protocol` 로만 안다. `psycopg` 를 import 하지 않는다.
"""

from __future__ import annotations

from collections.abc import Callable, Iterable
from datetime import datetime
from typing import Any

from careersignal.agents.strategy.checklist import (
    blocked_concepts,
    concept_of,
    draft_checklist,
    evidence_checks,
    item_of,
    output_identifier,
    version_marker,
)
from careersignal.agents.strategy.contract import (
    AGENT_VERSION,
    STORED,
    Channel,
    ChecklistConcept,
    ChecklistDraft,
    ChecklistItem,
    ChecklistKind,
    InterpretationInput,
    StrategyOutcome,
    StrategyRepository,
    StrategyWriter,
)
from careersignal.contracts.run_context import RunContext, StopReason
from careersignal.contracts.verification import TypedVerdict
from careersignal.providers.concurrency import DEFAULT_WORKERS, map_ordered

OUTPUT_TYPE = "strategy"
PRODUCED_BY = "strategy"
"""`analysis_outputs` 의 `output_type` 과 `produced_by_agent`.

두 값은 docs/erd.md 11.3 의 CHECK 로 묶여 있다. 한쪽만 바꾸면 적재가 거부된다.
"""

INTRO_ORDER_STEPS = 4
"""포트폴리오 소개 순서에 담는 항목 수.

화면이 한 줄에 네 칸을 그린다(`agent/main.py` 의 `ALL_INTRO_ORDERS`).
"""

OVERALL_CLUSTER_LABEL = "전체 기준"
"""기업군이 없는 범위의 소개 순서 라벨.

payload 의 `intro_orders[].cluster` 는 기업군 표시명이지만 `overall` 범위에는
기업군이 없다. 빈 문자열을 넣으면 화면이 라벨 없는 칸을 그리므로 말을 준다.
"""

STUDY_KICKER = "면접 검증"
BASELINE_KICKER = "기본기"
"""면접 카드의 머리말. 편차 항목은 `편차 <n>` 을 쓴다."""


def _cards_for(items: Iterable[ChecklistItem], channel: Channel) -> tuple[ChecklistItem, ...]:
    """해당 자리에 배정된 항목만 순서대로 고른다."""
    return tuple(item for item in items if channel in item.channels)


def _highlight(item: ChecklistItem) -> dict[str, Any]:
    """포트폴리오 강조점 하나.

    `body` 에 증명 방법을 적는다. 강조점은 "무엇을 보여 주는가" 이고 그 답이
    `evidence_needed` 다. `linked_item_ids` 는 개념 식별자다.
    """
    wording = item.wording
    return {
        "title": item.title,
        "body": wording.evidence_needed if wording else item.evidence_needed,
        "tips": list(wording.tips) if wording else [],
        "linked_item_ids": [item.concept_id],
    }


def _essay_card(item: ChecklistItem) -> dict[str, Any]:
    """자기소개서 카드 하나.

    `kind` 는 편차를 다루는 카드와 서사를 다듬는 카드를 가른다
    (`agent/main.py` 의 `EssayCard.kind` 주석).
    """
    wording = item.wording
    return {
        "kind": "deviation" if item.is_deviation else "narrative_polish",
        "title": item.title,
        "body": wording.reason if wording else item.reason,
        "narrative": wording.narrative if wording else None,
        "sample_sentence": wording.sample_sentence if wording else None,
        "tips": list(wording.tips) if wording else [],
        "linked_item_ids": [item.concept_id],
    }


def _interview_card(item: ChecklistItem) -> dict[str, Any]:
    """면접 카드 하나. 질문이 없으면 제목으로 만든 질문을 쓴다."""
    wording = item.wording
    if item.is_deviation and item.dev_n is not None:
        kicker = f"편차 {item.dev_n}"
    elif item.kind is ChecklistKind.STUDY:
        kicker = STUDY_KICKER
    else:
        kicker = BASELINE_KICKER
    question = (wording.interview_question if wording else None) or f"{item.title} 을 어떻게 준비했나요?"
    return {
        "kicker": kicker,
        "question": question,
        "followups": list(wording.interview_followups) if wording else [],
        "point": (wording.interview_point if wording else None) or item.reason,
        "linked_item_ids": [item.concept_id],
    }


def _intro_orders(
    interpretation: InterpretationInput, items: Iterable[ChecklistItem]
) -> list[dict[str, Any]]:
    """소개 순서 하나.

    범위 하나가 payload 하나이므로 그 범위의 순서만 담는다. 여섯 기업군을 한
    payload 에 담던 것은 뼈대의 고정 응답이었고, 이제 기업군마다 행이 따로 있다
    (CONTRACT 4장).

    순서는 체크리스트의 순서다. 편차가 앞에 오므로 그 기업군에서 갈리는 지점이
    먼저 읽힌다.
    """
    steps = [item.title for item in _cards_for(items, Channel.PORTFOLIO)]
    if not steps:
        return []
    return [
        {
            "cluster": interpretation.cluster_tag or OVERALL_CLUSTER_LABEL,
            "steps": steps[:INTRO_ORDER_STEPS],
        }
    ]


def build_payload(
    interpretation: InterpretationInput,
    items: Iterable[ChecklistItem],
    *,
    agent_version: str = AGENT_VERSION,
    source: str = STORED,
) -> dict[str, Any]:
    """`analysis_outputs(strategy).payload` 를 만든다(CONTRACT 5장 C).

    키를 바꾸지 않는다. 이 사전이 그대로 Express 를 거쳐 화면으로 간다.

    `checklist[].item_id` 는 개념 식별자다. 체크 상태의 키가 개념 식별자이므로
    여기서 어긋나면 로드맵 재조합이 깨진다.
    """
    ordered = tuple(items)
    return {
        "job": interpretation.job_role_id,
        "scope": {
            "level": str(interpretation.scope_level),
            "cluster_tag": interpretation.cluster_tag,
            "posting_id": interpretation.posting_id,
        },
        "checklist": [item.as_payload_entry() for item in ordered],
        "portfolio": {
            "highlights": [
                _highlight(item) for item in _cards_for(ordered, Channel.PORTFOLIO)
            ],
            "intro_orders": _intro_orders(interpretation, ordered),
        },
        "essay": [_essay_card(item) for item in _cards_for(ordered, Channel.ESSAY)],
        "interview": [
            _interview_card(item) for item in _cards_for(ordered, Channel.INTERVIEW)
        ],
        "agent_version": agent_version,
        "source": source,
    }


class StrategyPlanner:
    """해석 산출물에서 체크리스트와 활용처 전략을 만든다."""

    def __init__(
        self,
        writer: StrategyWriter,
        repository: StrategyRepository,
        workers: int = DEFAULT_WORKERS,
        stop_when: Callable[[BaseException], bool] | None = None,
        marker: str | None = None,
    ) -> None:
        """`workers` 는 동시에 보낼 모델 요청 수다. 1 이면 하나씩 부른다.

        `stop_when` 은 되살릴 수 없는 실패를 가르는 판정이다. 참이면 아직 보내지
        않은 초안을 더 보내지 않는다.

        `marker` 는 항목·산출물 식별자의 표식이다. 비우면 분석 버전에서 만든다.
        두 버전이 같은 식별자를 쓰면 두 번째 적재가 기본키에서 막히므로, 표식을
        직접 넘기는 쪽은 버전마다 다른 값을 준다. 데모 시드는 직무마다 활성 버전이
        하나뿐이라 `demo` 를 쓴다(CONTRACT 1장).
        """
        self._writer = writer
        self._repository = repository
        self._workers = workers
        self._stop_when = stop_when
        self._marker = marker

    def run(
        self, context: RunContext, interpretation: InterpretationInput
    ) -> StrategyOutcome:
        """범위 하나의 전략 산출물을 만든다.

        문구를 받기 전에 검사한다(16-3). 근거가 없거나 허용되지 않은 계층의 근거를
        딛는 항목은 모델에 보내지 않는다. 저장하지 않을 항목의 문구를 만드는 것은
        돈과 시간을 버리는 일이다.
        """
        self._require_same_scope(context, interpretation)
        marker = self._marker or version_marker(context.analysis_version)

        drafts = draft_checklist(interpretation)
        checks = evidence_checks(drafts)
        blocked = blocked_concepts(checks)
        rejected = tuple(d.concept_id for d in drafts if d.concept_id in blocked)

        pending = [d for d in drafts if d.concept_id not in blocked]
        # 예산을 넘겨 부르지 않는다. 보내기 전에 잘라야 동시 실행이 한도를 넘지 않는다.
        budget_exhausted = len(pending) > context.budget.max_tool_calls
        pending = pending[: context.budget.max_tool_calls]

        results = map_ordered(
            self._writer.write, pending, self._workers, self._stop_when
        )

        items: list[ChecklistItem] = []
        concepts: list[ChecklistConcept] = []
        errors: list[tuple[str, str]] = []

        for record in results:
            draft = record.item
            if record.error is not None:
                error = record.error
                errors.append(
                    (draft.concept_id, f"{type(error).__name__}: {error}")
                )
                continue
            wording = record.value
            if wording is None:
                errors.append((draft.concept_id, "문구가 비었다"))
                continue

            item = item_of(
                draft,
                wording,
                analysis_version=context.analysis_version,
                job_role_id=context.job_role_id,
                scope_level=interpretation.scope_level,
                scope_id=interpretation.scope_id,
                marker=marker,
            )
            try:
                created = self._store(context.job_role_id, draft, item)
            except Exception as exc:
                errors.append((draft.concept_id, f"{type(exc).__name__}: {exc}"))
                continue
            if created is not None:
                concepts.append(created)
            items.append(item)

        payload = build_payload(interpretation, items) if items else None
        output_id = None
        if payload is not None:
            output_id = output_identifier(
                context.job_role_id,
                interpretation.scope_level,
                interpretation.scope_id,
                marker,
            )
            try:
                self._repository.save_output(
                    self._output_row(
                        output_id, context, interpretation, payload, rejected
                    )
                )
            except Exception as exc:
                errors.append((output_id, f"{type(exc).__name__}: {exc}"))
                output_id = None

        return StrategyOutcome(
            agent_run_id=context.agent_run_id,
            stop_reason=_stop_reason(
                drafts=drafts,
                items=items,
                errors=bool(errors),
                rejected=bool(rejected),
                budget_exhausted=budget_exhausted,
            ),
            output_id=output_id,
            concepts=tuple(concepts),
            items=tuple(items),
            rejected=rejected,
            checks=checks,
            errors=tuple(errors),
            payload=payload,
        )

    # ------------------------------------------------------------ 내부
    def _store(
        self, job_role_id: str, draft: ChecklistDraft, item: ChecklistItem
    ) -> ChecklistConcept | None:
        """개념을 먼저 보장하고 인스턴스를 저장한다.

        개념이 이미 있으면 다시 만들지 않는다. 개념은 버전을 넘어 유지되며 같은
        제목에 두 번째 행을 만들면 `UNIQUE (job_role_id, canonical_title)` 이
        거부한다. 사용자 체크 상태가 그 행을 가리키고 있다는 것도 이유다.
        """
        concept = concept_of(job_role_id, draft)
        created = None
        if self._repository.find_concept(concept.concept_id) is None:
            self._repository.add_concept(concept.as_row())
            created = concept
        self._repository.add_item(item.as_row())
        return created

    def _output_row(
        self,
        output_id: str,
        context: RunContext,
        interpretation: InterpretationInput,
        payload: dict[str, Any],
        rejected: tuple[str, ...],
    ) -> dict[str, Any]:
        """`analysis_outputs` 한 줄.

        `scope_id` 는 NOT NULL 이다(docs/erd.md 11.3). `overall` 범위에는 범위
        식별자가 없으므로 직무 식별자를 넣는다(CONTRACT 4장의 표).

        검사에 걸려 뺀 항목이 있으면 `verified_with_warning` 이다. 걸린 항목은
        저장되지 않았으므로 이 산출물 자체는 정책을 어기지 않았지만, 준비 목록이
        불완전하다는 사실은 남겨야 한다.
        """
        status = (
            TypedVerdict.VERIFIED_WITH_WARNING if rejected else TypedVerdict.VERIFIED
        )
        return {
            "output_id": output_id,
            "analysis_version": context.analysis_version,
            "job_role_id": context.job_role_id,
            "scope_level": str(interpretation.scope_level),
            "scope_id": interpretation.scope_id or context.job_role_id,
            "output_type": OUTPUT_TYPE,
            "payload": payload,
            "produced_by_agent": PRODUCED_BY,
            "verification_status": str(status),
            "generated_at": datetime.now(),
        }

    def _require_same_scope(
        self, context: RunContext, interpretation: InterpretationInput
    ) -> None:
        """봉투와 입력의 범위가 다르면 실행하지 않는다.

        범위가 어긋난 채 저장하면 기업군의 편차가 직무 전체의 항목으로 남는다.
        되돌리려면 활성 버전을 통째로 다시 만들어야 한다.
        """
        if context.job_role_id != interpretation.job_role_id:
            raise ValueError("해석 산출물의 직무가 실행 봉투와 다르다")
        if context.scope_level != interpretation.scope_level:
            raise ValueError("해석 산출물의 범위 수준이 실행 봉투와 다르다")
        if context.scope_id != interpretation.scope_id:
            raise ValueError("해석 산출물의 범위 식별자가 실행 봉투와 다르다")


def _stop_reason(
    drafts: tuple[ChecklistDraft, ...],
    items: list[ChecklistItem],
    errors: bool,
    rejected: bool,
    budget_exhausted: bool,
) -> StopReason:
    """docs/agent-design.md 11.3의 종료 조건을 판정한다.

    순서가 의미를 갖는다. 예산이 끝나 초안을 남긴 실행을 완결로 볼 수 없고,
    연결 완전성 검사에 걸린 항목이 있는 실행을 통과로 볼 수 없다. 합격 전략의
    종료 조건이 "항목 연결 완전성 통과"(같은 문서 6장 표)이므로 걸린 항목이
    하나라도 있으면 명시적 실패다.
    """
    if budget_exhausted:
        return StopReason.BUDGET_EXHAUSTED
    if errors or rejected:
        return StopReason.EXPLICIT_FAILURE
    if not drafts:
        return StopReason.FRONTIER_EXHAUSTED
    if items:
        return StopReason.SLOTS_FILLED
    return StopReason.NO_NEW_EVIDENCE


__all__ = [
    "BASELINE_KICKER",
    "INTRO_ORDER_STEPS",
    "OUTPUT_TYPE",
    "OVERALL_CLUSTER_LABEL",
    "PRODUCED_BY",
    "STUDY_KICKER",
    "StrategyPlanner",
    "build_payload",
]
