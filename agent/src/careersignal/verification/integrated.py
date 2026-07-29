"""통합 Verifier. 위험 기반 계층화와 활성화 가능 판정.

정의는 docs/agent-design.md 9.1·9.5와 docs/architecture.md 8장을 따른다.
backlog 의 18-2(위험 기반 검증 계층화)와 18-3(통합 Verifier와 활성화 가능 판정)이
이 모듈에 있다.

세 부분으로 나뉜다.

- 계층화: 산출물의 성질만 보고 어떤 검사가 적용되는지 정하는 순수 함수. 저장소도
  모델도 부르지 않으므로 이 판단을 검사 안에 두지 않고 밖에서 검사할 수 있다.
- 조립: `default_registry` 가 검사 1~7 을 등록한다. 판정자를 주지 않아도 검사
  5·6·7 은 등록되며, 등록된 채로 `not_applicable` 을 낸다.
- 판정: 대상 목록으로 `CheckRunner` 를 돌리고 `verdict.validation_outcome` 에
  넘겨 `AnalysisVersionStatus` 를 얻는다. 판정 규칙을 여기서 다시 쓰지 않는다.

활성화 가능은 `gated` 도달을 뜻한다. `gated` 에서 `active` 로 가려면 수용 평가가
남아 있으므로(docs/architecture.md 8장), 이 모듈은 활성화를 수행하지 않고 그
전제가 성립하는지만 돌려준다.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from typing import Any

from careersignal.contracts.check_result import CheckName
from careersignal.contracts.run_context import RunContext
from careersignal.contracts.verification import TypedVerdict, is_publishable
from careersignal.domain.sampling import SampleStatus
from careersignal.domain.versioning import AnalysisVersionStatus
from careersignal.verification.checks.citation import CitationReader, citation_span_check
from careersignal.verification.checks.contradiction import (
    ABSENCE_CLAIM_TYPES,
    AbsenceJudge,
    ContradictionReader,
    contradiction_detector_check,
)
from careersignal.verification.checks.cross_model import (
    SAMPLE_SIZE,
    CrossModelJudge,
    CrossModelReader,
    cross_model_sample_audit_check,
    select_sample,
)
from careersignal.verification.checks.entailment import (
    EntailmentJudge,
    EntailmentReader,
    claim_evidence_entailment_check,
)
from careersignal.verification.checks.schema import (
    SCHEMA_RULES,
    SchemaRule,
    schema_check,
)
from careersignal.verification.checks.source_policy import (
    SourcePolicyReader,
    source_policy_check,
)
from careersignal.verification.checks.statistics import (
    StatisticsReader,
    numerical_consistency_check,
)
from careersignal.verification.protocol import CheckContext
from careersignal.verification.registry import CheckRegistry
from careersignal.verification.runner import CheckRunner, CheckRunReport
from careersignal.verification.verdict import decide, validation_outcome

TARGET_CLAIM = "analysis_claim"
TARGET_MENTION = "requirement_mention"
TARGET_WIKI = "wiki_revision"
TARGET_FACT = "statistic_fact"
TARGET_AGGREGATION = "statistics_aggregation"

CHECK_TARGETS: dict[CheckName, frozenset[str]] = {
    CheckName.SCHEMA: frozenset({TARGET_CLAIM}),
    CheckName.SOURCE_POLICY: frozenset({TARGET_CLAIM, TARGET_WIKI}),
    CheckName.CITATION_SPAN: frozenset({TARGET_CLAIM, TARGET_MENTION}),
    CheckName.NUMERICAL: frozenset({TARGET_FACT, TARGET_AGGREGATION}),
    CheckName.ENTAILMENT: frozenset({TARGET_CLAIM}),
    CheckName.CROSS_MODEL: frozenset({TARGET_CLAIM}),
    CheckName.CONTRADICTION: frozenset({TARGET_CLAIM}),
}
"""검사별 적용 대상 타입. 검사 8은 집계 단계라 여기 없다.

각 검사 모듈의 `TARGET_*` 상수와 같은 값이다. 여기 표는 실행 전에 어떤 검사가
돌 예정인지를 말하고, 실제 판정은 검사 안의 판별이 한다. 두 곳이 어긋나면
계층화가 예고한 것과 다른 결과가 나오므로 테스트가 두 값을 맞춘다.
"""

GENERALIZING_CLAIM_TYPES: frozenset[str] = frozenset(
    {"cluster_generalization", "inferred_requirement"}
)
"""한 회사의 근거를 직무 전체로 옮기는 주장 유형. docs/agent-design.md 9.1의 첫 줄."""

RISKY_SAMPLE_STATUSES: frozenset[SampleStatus] = frozenset(
    {
        SampleStatus.NOT_COMPUTABLE,
        SampleStatus.LOW_CONFIDENCE,
        SampleStatus.NOT_COMPARABLE,
    }
)
"""표본이 신뢰도 경계에 있는 상태. `analysis_ready` 만 경계 밖이다."""

RISK_GENERALIZATION = "generalization_from_narrow_base"
RISK_EXTERNAL_STRATEGY = "external_tier_strategy"
RISK_COUNTEREVIDENCE = "counterevidence_present"
RISK_CONFIDENCE_BOUNDARY = "confidence_boundary"
RISK_ABSENCE = "absence_claim"
RISK_FIRST_RUN = "first_run_of_version"
"""docs/agent-design.md 9.1의 여섯 조건. 이름이 곧 `detail` 에 남는 사유다."""


@dataclass(frozen=True, eq=False)
class TargetProfile:
    """검사 대상 하나의 성질.

    계층화가 보는 값만 담는다. 산출물의 내용은 담지 않는다. `payload` 만 예외이며,
    검사 1이 `jsonb` 내부를 보려면 값 자체가 필요하기 때문이다(docs/agent-design.md
    9장의 검사 1).
    """

    target_type: str
    target_id: str
    claim_type: str | None = None
    sample_status: SampleStatus | None = None
    has_evidence: bool = True
    has_counterevidence: bool = False
    external_tier_evidence: bool = False
    generalized_from_narrow_base: bool = False
    first_run_of_version: bool = False
    payload: Mapping[str, Any] = field(default_factory=dict)


def risk_reasons(profile: TargetProfile) -> tuple[str, ...]:
    """docs/agent-design.md 9.1의 위험 조건 가운데 걸린 것.

    사유를 참·거짓 하나로 접지 않고 목록으로 돌려준다. 어떤 조건 때문에 교차 감사에
    들어갔는지가 남아야, 표본이 한 조건에만 쏠렸을 때 그것을 볼 수 있다.
    """
    if profile.target_type != TARGET_CLAIM:
        return ()

    reasons: list[str] = []
    if profile.generalized_from_narrow_base or (
        profile.claim_type in GENERALIZING_CLAIM_TYPES
    ):
        reasons.append(RISK_GENERALIZATION)
    if profile.claim_type == "strategy" and profile.external_tier_evidence:
        reasons.append(RISK_EXTERNAL_STRATEGY)
    if profile.has_counterevidence:
        reasons.append(RISK_COUNTEREVIDENCE)
    if profile.sample_status in RISKY_SAMPLE_STATUSES:
        reasons.append(RISK_CONFIDENCE_BOUNDARY)
    if profile.claim_type in ABSENCE_CLAIM_TYPES:
        reasons.append(RISK_ABSENCE)
    if profile.first_run_of_version:
        reasons.append(RISK_FIRST_RUN)
    return tuple(reasons)


def is_risk_sample(profile: TargetProfile) -> bool:
    """교차 판정 대상인지. 조건 하나라도 걸리면 대상이다."""
    return bool(risk_reasons(profile))


def planned_checks(profile: TargetProfile) -> frozenset[CheckName]:
    """이 대상에 적용되는 검사. 순수 함수다.

    검사 6은 위험 표본에만 적용한다. 검사 5는 근거가 없으면 함의를 따질 것이 없어
    빠진다. 나머지는 대상 타입만으로 정해진다.
    """
    planned = {
        check
        for check, targets in CHECK_TARGETS.items()
        if profile.target_type in targets
    }
    if not is_risk_sample(profile):
        planned.discard(CheckName.CROSS_MODEL)
    if not profile.has_evidence:
        planned.discard(CheckName.ENTAILMENT)
    return frozenset(planned)


def risk_sample(
    profiles: Sequence[TargetProfile], size: int = SAMPLE_SIZE
) -> tuple[str, ...]:
    """위험 조건에 걸린 주장 가운데 교차 감사할 표본.

    검사 6의 `select_sample` 과 같은 규칙이다. 정렬 후 앞에서 `size` 개이므로 같은
    산출물이면 실행마다 같은 표본이 나온다.
    """
    return select_sample((p.target_id for p in profiles if is_risk_sample(p)), size)


def default_registry(
    *,
    schema_rules: Sequence[SchemaRule] = SCHEMA_RULES,
    source_policy_reader: SourcePolicyReader | None = None,
    citation_reader: CitationReader | None = None,
    statistics_reader: StatisticsReader | None = None,
    entailment_reader: EntailmentReader | None = None,
    cross_model_reader: CrossModelReader | None = None,
    contradiction_reader: ContradictionReader | None = None,
    entailment_judge: EntailmentJudge | None = None,
    cross_model_judge: CrossModelJudge | None = None,
    absence_judge: AbsenceJudge | None = None,
    sample_size: int = SAMPLE_SIZE,
    registry: CheckRegistry | None = None,
) -> CheckRegistry:
    """검사 1~7 을 등록한 레지스트리를 만든다.

    검사 5·6·7 은 판정자가 없어도 등록한다. 등록하지 않으면 러너가
    `CHECK_NOT_REGISTERED` 로 기록하고 판정이 막히지만, 등록해 두면 판정자가 빈 채로
    `not_applicable` 이 나와 검사 1~4 만으로 분석 버전이 `gated` 에 이른다. 데모의
    모델 호출 0회는 이 차이에서 나온다(agent/data/demo_seed/CONTRACT.md 11장).

    검사 2·3·4 는 조회가 없으면 등록하지 않는다. 이 셋은 조회 없이는 아무것도
    판정할 수 없어, 등록해 두면 무엇을 검사했는지 모르는 통과가 생긴다. 미등록은
    러너가 기록하므로 빠진 사실이 결과에 남는다.
    """
    if entailment_judge is not None and entailment_reader is None:
        raise ValueError("검사 5의 판정자를 주면 조회도 함께 줘야 한다")
    if cross_model_judge is not None and cross_model_reader is None:
        raise ValueError("검사 6의 판정자를 주면 조회도 함께 줘야 한다")
    if absence_judge is not None and contradiction_reader is None:
        raise ValueError("검사 7의 판정자를 주면 조회도 함께 줘야 한다")

    target = registry or CheckRegistry()
    target.register(CheckName.SCHEMA, schema_check(schema_rules))
    if source_policy_reader is not None:
        target.register(
            CheckName.SOURCE_POLICY, source_policy_check(source_policy_reader)
        )
    if citation_reader is not None:
        target.register(CheckName.CITATION_SPAN, citation_span_check(citation_reader))
    if statistics_reader is not None:
        target.register(
            CheckName.NUMERICAL, numerical_consistency_check(statistics_reader)
        )
    target.register(
        CheckName.ENTAILMENT,
        claim_evidence_entailment_check(entailment_reader, entailment_judge),
    )
    target.register(
        CheckName.CROSS_MODEL,
        cross_model_sample_audit_check(
            cross_model_reader, cross_model_judge, sample_size
        ),
    )
    target.register(
        CheckName.CONTRADICTION,
        contradiction_detector_check(contradiction_reader, absence_judge),
    )
    return target


@dataclass(frozen=True, eq=False)
class IntegrationReport:
    """한 분석 버전의 통합 검증 결과."""

    analysis_version: str
    reports: tuple[CheckRunReport, ...]
    verdicts: Mapping[tuple[str, str], TypedVerdict | None]
    status: AnalysisVersionStatus

    @property
    def activatable(self) -> bool:
        """활성화로 갈 수 있는지.

        `gated` 는 검증을 통과하고 수용 평가를 기다리는 상태다. 활성화 자체는 수용
        평가를 거쳐야 하므로(docs/architecture.md 8장) 이 값은 그 전제만 말한다.
        """
        return self.status is AnalysisVersionStatus.GATED

    @property
    def undecided(self) -> tuple[tuple[str, str], ...]:
        """판정을 얻지 못한 대상. 선언된 검사가 다 돌지 않았다는 뜻이다."""
        return tuple(key for key, verdict in self.verdicts.items() if verdict is None)

    @property
    def blocked(self) -> tuple[tuple[str, str], ...]:
        """공개할 수 없는 대상. 판정 불가도 포함한다."""
        return tuple(
            key
            for key, verdict in self.verdicts.items()
            if verdict is None or not is_publishable(verdict)
        )


class IntegratedVerifier:
    """분석 버전의 필수 산출물을 한 번에 검증한다.

    docs/agent-design.md 9.5의 통합 Verifier 다. 오케스트레이터가 모든 단계 뒤에
    부른다. 판정 규칙은 갖지 않고 `verdict.py` 의 것을 그대로 쓴다.
    """

    def __init__(
        self,
        registry: CheckRegistry | None = None,
        runner: CheckRunner | None = None,
    ) -> None:
        if runner is not None and registry is not None:
            raise ValueError("러너와 레지스트리를 함께 주지 않는다")
        self._runner = runner or CheckRunner(registry)

    @property
    def runner(self) -> CheckRunner:
        return self._runner

    @staticmethod
    def context(run: RunContext, profile: TargetProfile) -> CheckContext:
        return CheckContext(
            run=run,
            target_type=profile.target_type,
            target_id=profile.target_id,
            payload=dict(profile.payload),
        )

    def verify(
        self,
        run: RunContext,
        profiles: Sequence[TargetProfile],
        unmet: Mapping[str, Sequence[str]] | None = None,
    ) -> IntegrationReport:
        """대상 전부를 검사하고 분석 버전의 다음 상태를 정한다.

        `unmet` 은 대상별 미충족 필수 슬롯이다. 대상이 하나도 없으면
        `validation_outcome` 이 `failed` 를 낸다. 검증하지 않은 버전을 수용 평가로
        넘기지 않기 위해서다.
        """
        slots = unmet or {}
        reports = tuple(
            self._runner.run(self.context(run, profile)) for profile in profiles
        )
        verdicts = {
            (report.target_type, report.target_id): decide(
                report, slots.get(report.target_id, ())
            )
            for report in reports
        }
        return IntegrationReport(
            analysis_version=run.analysis_version,
            reports=reports,
            verdicts=verdicts,
            status=validation_outcome(reports, slots),
        )


__all__ = [
    "CHECK_TARGETS",
    "GENERALIZING_CLAIM_TYPES",
    "RISKY_SAMPLE_STATUSES",
    "RISK_ABSENCE",
    "RISK_CONFIDENCE_BOUNDARY",
    "RISK_COUNTEREVIDENCE",
    "RISK_EXTERNAL_STRATEGY",
    "RISK_FIRST_RUN",
    "RISK_GENERALIZATION",
    "IntegratedVerifier",
    "IntegrationReport",
    "TargetProfile",
    "default_registry",
    "is_risk_sample",
    "planned_checks",
    "risk_reasons",
    "risk_sample",
]
