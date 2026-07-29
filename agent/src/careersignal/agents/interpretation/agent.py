"""채용공고 해석의 실행 골격 (Phase 15).

정의는 docs/agent-design.md 5.1·7.4·8장, docs/erd.md 11.3~11.6,
`agent/data/demo_seed/CONTRACT.md` 5장 B·8장을 따른다.

읽는 것은 `statistics_facts` 와 공고 근거이고, 내는 것은
`analysis_outputs(interpretation)` payload, `analysis_claims`,
`analysis_claim_evidence`, `coverage_assertions` 다. 수치를 다시 계산하지 않는다.
집계가 낸 값을 견주고 문장을 붙일 뿐이다.

저장소는 `Protocol` 로 받는다. 이 모듈은 `psycopg` 를 import 하지 않는다. 모델
호출은 `providers/concurrency.map_ordered` 로 묶어 던지고, 저장은 주 갈래에서
입력 순서대로 한다. 저장소는 연결 하나를 감싸며 스레드 안전하지 않다.

`build_payload` 는 공개 함수다. B11(FastAPI)과 B13(Express)이 이 형태에 의존하므로
키 이름을 바꾸지 않는다.
"""

from __future__ import annotations

import hashlib
from collections.abc import Callable, Mapping, Sequence
from typing import Any

from careersignal.agents.interpretation import baseline as rules
from careersignal.agents.interpretation.contract import (
    AGENT_NAME,
    AGENT_VERSION,
    BASELINE_SLOT,
    CLUSTER_SLOT,
    OFFICIAL_SLOT,
    OUTPUT_TYPE,
    BaselineItem,
    ClaimDraft,
    ClaimType,
    ConfidenceGrade,
    ContextSignal,
    CoverageAssertion,
    DeviationInterpreter,
    DeviationItem,
    EntailmentJudge,
    EvidenceRef,
    InterpretationOutcome,
    InterpretationRepository,
    PostingEvidence,
    PostingView,
    Relation,
    RequirementKind,
    ScopeRef,
    StatisticFact,
    SupportType,
    UnchangedItem,
    VerificationStatus,
    interpretation_objective,
)
from careersignal.contracts.run_context import RunContext, StopReason
from careersignal.domain.scope import ScopeLevel
from careersignal.providers.concurrency import DEFAULT_WORKERS, map_ordered

SOURCE_AGENT = "agent"
"""payload 의 `source`. 온디맨드 실행이 낸 결과다.

`stored` 와 `cache` 는 이 에이전트가 아니라 서빙 경로가 붙인다
(`CONTRACT.md` 5장 B).
"""

NO_DEVIATION_TEXT = "이 범위에서 {title} 의 요구 수준은 직무 전체 기대치와 같다"
UNCHANGED_NOTE = "이 범위도 요구 수준은 공통 기대치와 같습니다. 차별화 지점이 아니라 전제 조건입니다."


def output_identifier(
    analysis_version: str, scope_level: str, scope_id: str
) -> str:
    """같은 버전·같은 범위의 해석은 같은 산출물이다.

    `analysis_outputs` 의 유일 제약이 (버전, 범위, 종류) 이므로 식별자도 그 조합에서
    결정적으로 나와야 다시 실행한 결과가 같은 행을 덮는다.
    """
    material = f"{analysis_version}:{OUTPUT_TYPE}:{scope_level}:{scope_id}".encode()
    return f"out_{hashlib.sha256(material).hexdigest()[:24]}"


def claim_identifier(output_id: str, claim_type: str, subject: str) -> str:
    """같은 산출물의 같은 주제·같은 유형은 같은 주장이다."""
    material = f"{output_id}:{claim_type}:{subject}".encode()
    return f"claim_{hashlib.sha256(material).hexdigest()[:24]}"


def assertion_identifier(output_id: str, subject: str) -> str:
    material = f"{output_id}:coverage:{subject}".encode()
    return f"cov_{hashlib.sha256(material).hexdigest()[:24]}"


def build_payload(
    job: str,
    scope: ScopeRef,
    baseline: Sequence[BaselineItem],
    deviations: Sequence[DeviationItem] = (),
    unchanged: Sequence[UnchangedItem] = (),
    posting: PostingView | None = None,
    agent_version: str = AGENT_VERSION,
    source: str = SOURCE_AGENT,
) -> dict[str, Any]:
    """`analysis_outputs.payload` 를 조립한다 (`CONTRACT.md` 5장 B).

    키를 바꾸지 않는다. 화면(React)과 서버(Express)가 이 이름으로 읽고, FastAPI 의
    `/reverse` 응답 모델도 같은 모양이다.

    `deviations` 의 `requirement_kind` 는 payload 에 넣지 않는다. 3구분은 저장
    경로(`analysis_claims.requirement_kind`)가 갖는 값이고, 화면 계약에는 그 키가
    없다. 계약에 없는 키를 payload 에 흘리면 서빙 경로가 payload 를 그대로
    돌려주는 순간(Phase 22) 응답 모양이 갈라진다.
    """
    return {
        "job": job,
        "scope": {
            "level": str(scope.level),
            "cluster_tag": scope.cluster_tag,
            "posting_id": scope.posting_id,
        },
        "baseline": [item.model_dump() for item in baseline],
        "deviations": [
            item.model_dump(exclude={"requirement_kind"}) for item in deviations
        ],
        "unchanged": [item.model_dump() for item in unchanged],
        "posting": posting.model_dump(mode="json") if posting else None,
        "agent_version": agent_version,
        "source": source,
    }


class InterpretationAgent:
    """직무 기준선과 이 범위의 편차를 해석해 저장한다."""

    def __init__(
        self,
        interpreter: DeviationInterpreter,
        repository: InterpretationRepository,
        judge: EntailmentJudge | None = None,
        workers: int = DEFAULT_WORKERS,
        stop_when: Callable[[BaseException], bool] | None = None,
    ) -> None:
        """`judge` 는 근거 함의 판정자다(15-3).

        없으면 붙은 근거를 그대로 믿는다. 실제 판정 구현은 B6 이 검사 5 로 넣으며,
        그때까지 이 자리에는 대역만 들어온다.
        """
        self._interpreter = interpreter
        self._repository = repository
        self._judge = judge
        self._workers = workers
        self._stop_when = stop_when

    # ------------------------------------------------------------------ 실행
    def run(
        self,
        context: RunContext,
        scope: ScopeRef,
        titles: Mapping[str, str] | None = None,
        descriptions: Mapping[str, str] | None = None,
        evidence: Mapping[str, Sequence[PostingEvidence]] | None = None,
        signals: Sequence[ContextSignal] = (),
        population_n: int | None = None,
        checked_n: int | None = None,
        posting: PostingView | None = None,
    ) -> InterpretationOutcome:
        """범위 하나를 해석한다.

        `population_n` 과 `checked_n` 은 편차 없음을 말할 수 있는지 가르는 범위
        확인의 재료다(docs/erd.md 11.6). 주지 않으면 범위 확인을 만들지 않고,
        편차 없음 주장도 내지 않는다. 검사하지 않은 것을 부재로 말하지 않는다.
        """
        objective = interpretation_objective(
            context.job_role_id, scope.level, context.scope_id
        )
        evidence = dict(evidence or {})
        scope_id = context.scope_id or context.job_role_id

        baseline_facts = self._facts(
            context.analysis_version, ScopeLevel.OVERALL, context.job_role_id
        )
        scope_facts = (
            baseline_facts
            if scope.level is ScopeLevel.OVERALL
            else self._facts(context.analysis_version, scope.level, scope_id)
        )

        items = rules.baseline_items(baseline_facts, titles, descriptions)
        verdicts = rules.deviations(baseline_facts, scope_facts, titles)

        # 예산을 넘겨 부르지 않는다. 보내기 전에 잘라야 동시 실행이 한도를 넘지 않는다.
        budget_exhausted = len(verdicts) > context.budget.max_tool_calls
        verdicts = verdicts[: context.budget.max_tool_calls]

        refs = self._evidence_refs(verdicts, evidence, signals)
        conflicts = rules.conflicting_supports(refs)

        results = map_ordered(
            lambda verdict: self._interpreter.interpret(
                verdict.topic,
                verdict.baseline_text,
                self._deviation_text(verdict),
                tuple(e.text for e in evidence.get(verdict.dimension_id, ())),
            ),
            verdicts,
            self._workers,
            self._stop_when,
        )

        errors: list[tuple[str, str]] = []
        deviation_items: list[DeviationItem] = []
        graded: dict[str, ConfidenceGrade] = {}
        kinds: dict[str, RequirementKind] = {}
        for record in results:
            verdict = record.item
            if record.error is not None:
                error = record.error
                errors.append(
                    (verdict.dimension_id, f"{type(error).__name__}: {error}")
                )
                continue
            narrative = record.value
            assert narrative is not None  # map_ordered 는 값이나 예외 하나를 준다
            dimension_refs = refs.get(verdict.dimension_id, ())
            supports, contradicts = rules.support_counts(tuple(dimension_refs))
            grade = rules.confidence_grade(
                verdict,
                supports,
                self._independent_companies(evidence.get(verdict.dimension_id, ())),
                contradicted=bool(contradicts),
            )
            graded[verdict.dimension_id] = grade
            kinds[verdict.dimension_id] = narrative.requirement_kind
            deviation_items.append(
                DeviationItem(
                    item_id=verdict.dimension_id,
                    topic=verdict.topic,
                    baseline=verdict.baseline_text,
                    deviation=narrative.deviation_label
                    or self._deviation_text(verdict),
                    evidence=self._quote(
                        evidence.get(verdict.dimension_id, ()), signals
                    ),
                    explanation=narrative.explanation,
                    confidence=grade,
                    ratio=verdict.ratio_text,
                    related_stat="#items",
                    requirement_kind=narrative.requirement_kind,
                )
            )

        assertion = self._assertion(
            context, scope, scope_id, population_n, checked_n, len(deviation_items)
        )
        unchanged = rules.unchanged_items(
            items,
            (item.item_id for item in deviation_items),
            assertion,
            UNCHANGED_NOTE,
        )

        payload = build_payload(
            job=context.job_role_id,
            scope=scope,
            baseline=items,
            deviations=tuple(deviation_items),
            unchanged=unchanged,
            posting=posting,
        )
        output_id = output_identifier(
            context.analysis_version, str(scope.level), scope_id
        )
        claims = self._claims(
            output_id,
            context,
            scope,
            scope_id,
            items,
            deviation_items,
            unchanged,
            refs,
            graded,
            kinds,
            baseline_facts,
            assertion,
        )

        stored_claims, stored_evidence, store_errors = self._store(
            context, output_id, payload, claims, assertion
        )
        errors.extend(store_errors)

        filled = {
            BASELINE_SLOT: len(rules.facts_by_dimension(
                baseline_facts, rules.PREVALENCE_FAMILY
            )),
            CLUSTER_SLOT: sum(len(v) for v in evidence.values()),
            OFFICIAL_SLOT: len(signals),
        }
        unmet = objective.unmet(filled)

        return InterpretationOutcome(
            agent_run_id=context.agent_run_id,
            stop_reason=_stop_reason(
                has_facts=bool(baseline_facts),
                created=stored_claims,
                unmet=unmet,
                errors=bool(errors),
                budget_exhausted=budget_exhausted,
            ),
            output_id=output_id,
            payload=payload,
            created_claims=stored_claims,
            created_evidence=stored_evidence,
            created_assertions=1 if assertion is not None and not store_errors else 0,
            unmet_slots=unmet,
            conflicts=conflicts,
            errors=tuple(errors),
        )

    # ------------------------------------------------------------------ 내부
    def _facts(
        self, analysis_version: str, scope_level: ScopeLevel, scope_id: str
    ) -> tuple[StatisticFact, ...]:
        rows = self._repository.statistics_facts(
            analysis_version, str(scope_level), scope_id
        )
        return tuple(StatisticFact(**row) for row in rows)

    def _deviation_text(self, verdict: rules.DeviationVerdict) -> str:
        """편차가 요구하는 수준을 수치로 적은 기본 문구."""
        if verdict.scope_pct is None:
            return verdict.topic
        return f"이 범위 {verdict.scope_pct}%"

    def _independent_companies(self, items: Sequence[PostingEvidence]) -> int:
        """지지 근거를 낸 독립 회사 수.

        같은 회사의 공고 여러 건은 회사 하나의 사정이지 기업군의 성질이 아니다.
        """
        return len({e.company_id for e in items if e.relation is Relation.SUPPORTS})

    def _evidence_refs(
        self,
        verdicts: Sequence[rules.DeviationVerdict],
        evidence: Mapping[str, Sequence[PostingEvidence]],
        signals: Sequence[ContextSignal],
    ) -> dict[str, tuple[EvidenceRef, ...]]:
        """차원마다 붙일 근거를 모은다. 함의 판정을 통과한 것만 남긴다 (15-3).

        판정자가 없으면 붙은 근거를 그대로 쓴다. 판정자가 지지하지 않는다고 답한
        근거는 버리고, 어긋난다고 답한 근거는 `contradicts` 로 남긴다. 반박 근거를
        버리지 않는 이유는 그것이 상충 검사(15-4)의 입력이기 때문이다.
        """
        by_dimension: dict[str, tuple[EvidenceRef, ...]] = {}
        for verdict in verdicts:
            claim_text = NO_DEVIATION_TEXT.format(title=verdict.topic)
            refs: list[EvidenceRef] = []
            for item in evidence.get(verdict.dimension_id, ()):
                relation = self._relation(claim_text, item.text, item.relation)
                if relation is None:
                    continue
                refs.append(
                    EvidenceRef(
                        support_type=SupportType.CHUNK,
                        support_id=item.chunk_id,
                        relation=relation,
                    )
                )
            for signal in signals:
                if signal.dimension_id != verdict.dimension_id:
                    continue
                relation = self._relation(claim_text, signal.text, Relation.SUPPORTS)
                if relation is None:
                    continue
                refs.append(
                    EvidenceRef(
                        support_type=signal.support_type,
                        support_id=signal.support_id,
                        relation=relation,
                    )
                )
            if refs:
                by_dimension[verdict.dimension_id] = tuple(refs)
        return by_dimension

    def _relation(
        self, claim_text: str, evidence_text: str, declared: Relation
    ) -> Relation | None:
        """함의 판정 결과의 관계. 지지하지 못하는 근거는 `None` 이다."""
        if self._judge is None:
            return declared
        verdict = self._judge.judge(claim_text, evidence_text)
        if verdict.relation is Relation.CONTRADICTS:
            return Relation.CONTRADICTS
        if not verdict.entailed:
            return None
        return declared

    def _quote(
        self, items: Sequence[PostingEvidence], signals: Sequence[ContextSignal]
    ) -> str:
        """payload 의 `evidence` 칸. 원문 문장을 그대로 인용한다."""
        for item in items:
            if item.relation is Relation.SUPPORTS:
                return f'"{item.text}"'
        for signal in signals:
            return f"{signal.topic} · 회사 공식 자료"
        return "근거 문장 없음"

    def _assertion(
        self,
        context: RunContext,
        scope: ScopeRef,
        scope_id: str,
        population_n: int | None,
        checked_n: int | None,
        matched_n: int,
    ) -> CoverageAssertion | None:
        if population_n is None or checked_n is None:
            return None
        output_id = output_identifier(
            context.analysis_version, str(scope.level), scope_id
        )
        return rules.coverage_assertion(
            assertion_identifier(output_id, scope_id),
            scope.level,
            scope_id,
            population_n=population_n,
            checked_n=checked_n,
            matched_n=min(matched_n, checked_n),
            assertion=f"{scope_id} 범위의 편차 전수 검사",
        )

    def _claims(
        self,
        output_id: str,
        context: RunContext,
        scope: ScopeRef,
        scope_id: str,
        items: Sequence[BaselineItem],
        deviation_items: Sequence[DeviationItem],
        unchanged: Sequence[UnchangedItem],
        refs: Mapping[str, tuple[EvidenceRef, ...]],
        graded: Mapping[str, ConfidenceGrade],
        kinds: Mapping[str, RequirementKind],
        baseline_facts: Sequence[StatisticFact],
        assertion: CoverageAssertion | None,
    ) -> tuple[ClaimDraft, ...]:
        """payload 의 각 줄을 주장 행으로 옮긴다.

        기준선은 `statistic`, 편차는 3구분에 따른 유형, 편차 없음은 `no_deviation`
        이다. 편차 없음은 범위 확인이 참일 때만 만든다(docs/agent-design.md 7.4).
        """
        facts = rules.facts_by_dimension(baseline_facts, rules.PREVALENCE_FAMILY)
        drafts: list[ClaimDraft] = []

        for item in items:
            fact = facts.get(item.item_id)
            drafts.append(
                ClaimDraft(
                    claim_id=claim_identifier(
                        output_id, ClaimType.STATISTIC, item.item_id
                    ),
                    claim_type=ClaimType.STATISTIC,
                    scope_level=ScopeLevel.OVERALL,
                    scope_id=context.job_role_id,
                    claim_text=f"{item.title} 은(는) 직무 전체 공고의 {item.freq_pct}% 에 나타난다",
                    structured_slots={
                        "dimension_id": item.item_id,
                        "freq_pct": item.freq_pct,
                        "required_ratio": item.required_ratio,
                    },
                    confidence_components={"verification_status": "needs_research"},
                    verification_status=VerificationStatus.NEEDS_RESEARCH,
                    evidence=(
                        (
                            EvidenceRef(
                                support_type=SupportType.STATISTIC_FACT,
                                support_id=fact.fact_id,
                            ),
                        )
                        if fact
                        else ()
                    ),
                )
            )

        for deviation in deviation_items:
            kind = kinds.get(deviation.item_id, deviation.requirement_kind)
            claim_type = _claim_type(kind, scope.level)
            dimension_refs = refs.get(deviation.item_id, ())
            supports, contradicts = rules.support_counts(dimension_refs)
            drafts.append(
                ClaimDraft(
                    claim_id=claim_identifier(output_id, claim_type, deviation.item_id),
                    claim_type=claim_type,
                    requirement_kind=kind,
                    scope_level=scope.level,
                    scope_id=scope_id,
                    claim_text=f"{deviation.topic}: {deviation.deviation}",
                    structured_slots={
                        "dimension_id": deviation.item_id,
                        "baseline": deviation.baseline,
                        "deviation": deviation.deviation,
                    },
                    confidence_components={
                        "independent_support_count": supports,
                        "contradiction_status": "contradicted"
                        if contradicts
                        else "none",
                        "display_grade": str(
                            graded.get(deviation.item_id, ConfidenceGrade.LOW)
                        ),
                    },
                    verification_status=(
                        VerificationStatus.CONTRADICTED
                        if contradicts
                        else VerificationStatus.NEEDS_RESEARCH
                    ),
                    evidence=dimension_refs,
                )
            )

        if rules.may_assert_no_deviation(assertion) and assertion is not None:
            for item in unchanged:
                drafts.append(
                    ClaimDraft(
                        claim_id=claim_identifier(
                            output_id, ClaimType.NO_DEVIATION, item.item_id
                        ),
                        claim_type=ClaimType.NO_DEVIATION,
                        scope_level=scope.level,
                        scope_id=scope_id,
                        claim_text=NO_DEVIATION_TEXT.format(title=item.title),
                        structured_slots={
                            "dimension_id": item.item_id,
                            "assertion_id": assertion.assertion_id,
                            "population_n": assertion.population_n,
                            "checked_n": assertion.checked_n,
                        },
                        confidence_components={"scope_coverage": "complete"},
                        verification_status=VerificationStatus.NEEDS_RESEARCH,
                    )
                )
        return tuple(drafts)

    def _store(
        self,
        context: RunContext,
        output_id: str,
        payload: Mapping[str, Any],
        claims: Sequence[ClaimDraft],
        assertion: CoverageAssertion | None,
    ) -> tuple[int, int, list[tuple[str, str]]]:
        """산출물·주장·근거·범위 확인을 저장한다.

        산출물을 먼저 넣는다. `analysis_claims.output_id` 가 그 행을 가리키므로
        순서가 뒤집히면 외래키가 끊긴다. 산출물 저장이 실패하면 주장을 시도하지
        않는다. 가리킬 곳이 없는 주장을 만들지 않는다.
        """
        errors: list[tuple[str, str]] = []
        try:
            self._repository.add_output(
                {
                    "output_id": output_id,
                    "analysis_version": context.analysis_version,
                    "job_role_id": context.job_role_id,
                    "scope_level": str(payload["scope"]["level"]),
                    "scope_id": context.scope_id or context.job_role_id,
                    "output_type": OUTPUT_TYPE,
                    "payload": dict(payload),
                    "produced_by_agent": AGENT_NAME,
                    "verification_status": str(VerificationStatus.NEEDS_RESEARCH),
                }
            )
        except Exception as exc:  # noqa: BLE001 - 실패를 결과로 옮긴다
            return 0, 0, [(output_id, f"{type(exc).__name__}: {exc}")]

        stored_claims = 0
        stored_evidence = 0
        for claim in claims:
            try:
                self._repository.add_claim(
                    claim.row(context.analysis_version, output_id)
                )
            except Exception as exc:  # noqa: BLE001
                errors.append((claim.claim_id, f"{type(exc).__name__}: {exc}"))
                continue
            stored_claims += 1
            for row in claim.evidence_rows():
                try:
                    self._repository.add_claim_evidence(row)
                except Exception as exc:  # noqa: BLE001
                    errors.append((claim.claim_id, f"{type(exc).__name__}: {exc}"))
                    continue
                stored_evidence += 1

        if assertion is not None:
            try:
                self._repository.add_coverage_assertion(
                    assertion.row(context.analysis_version)
                )
            except Exception as exc:  # noqa: BLE001
                errors.append((assertion.assertion_id, f"{type(exc).__name__}: {exc}"))
        return stored_claims, stored_evidence, errors


def _claim_type(kind: RequirementKind, scope_level: ScopeLevel) -> ClaimType:
    """3구분과 범위에서 주장 유형을 정한다.

    해석한 요구와 맥락 신호는 범위와 무관하게 자기 유형을 갖는다. 명시 요구만
    범위가 가른다. 기업군 범위의 명시 요구는 여러 공고를 묶은 일반화이고, 공고
    범위의 명시 요구는 그 공고의 사실이다. 둘을 한 유형으로 두면 표본 하나로 한
    말과 기업군 전체로 한 말을 구분하지 못한다.
    """
    if kind is RequirementKind.INFERRED_REQUIREMENT:
        return ClaimType.INFERRED_REQUIREMENT
    if kind is RequirementKind.COMPANY_CONTEXT_SIGNAL:
        return ClaimType.COMPANY_CONTEXT_SIGNAL
    if scope_level is ScopeLevel.POSTING:
        return ClaimType.POSTING_EXPLICIT
    return ClaimType.CLUSTER_GENERALIZATION


def _stop_reason(
    has_facts: bool,
    created: int,
    unmet: Sequence[str],
    errors: bool,
    budget_exhausted: bool,
) -> StopReason:
    """docs/agent-design.md 11.1 의 종료 조건을 판정한다.

    순서가 의미를 갖는다. 예산이 끝나 편차를 남긴 실행을 전수 조사로 볼 수 없고,
    저장이 깨진 실행을 슬롯 충족으로 볼 수 없다. 필수 슬롯이 비었으면 주장을
    저장했더라도 충족이 아니다.
    """
    if budget_exhausted:
        return StopReason.BUDGET_EXHAUSTED
    if errors:
        return StopReason.EXPLICIT_FAILURE
    if not has_facts:
        return StopReason.FRONTIER_EXHAUSTED
    if unmet:
        return StopReason.NO_NEW_EVIDENCE
    if created:
        return StopReason.SLOTS_FILLED
    return StopReason.NO_NEW_EVIDENCE


__all__ = [
    "NO_DEVIATION_TEXT",
    "SOURCE_AGENT",
    "UNCHANGED_NOTE",
    "InterpretationAgent",
    "assertion_identifier",
    "build_payload",
    "claim_identifier",
    "output_identifier",
]
