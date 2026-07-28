"""지표 family 실행과 저장.

절차는 docs/statistics-model.md 5.1 의 집계 파이프라인이고, 수식은
docs/metric-spec.md 3장, 저장 자리는 docs/erd.md 10.5 다.

집계는 결정적으로 수행한다. 생성 모델은 수치를 산출하지 않으므로 이 실행에 모델 호출이
없다(docs/statistics-model.md 5.1). 실행은 조합을 전개하고, SQL 로 카운트를 얻고,
카운트를 measure 행으로 옮겨 저장하는 세 단계다. 앞의 둘은 순수 함수와 저장소가 나눠
갖고 이 모듈은 순서를 정한다.

단계를 셋으로 나눈다. 앞선 family 의 결과를 뒤가 입력으로 쓰기 때문이다.

1. `posting_prevalence`·`requiredness_ratio`·`depth_distribution`·`scope_expansion`·
   `entry_label_advanced_signal_rate`. 서로 기대지 않는다.
2. `cooccurrence`. 차원 쌍의 전개가 `posting_prevalence` 의 분자로 대상을 자른다
   (docs/metric-spec.md 5장).
3. `cluster_contrast`. 기업군과 직무 전체의 `posting_prevalence` 를 견준다
   (같은 문서 3.4).

뒤 두 단계의 입력은 메모리가 아니라 저장된 행에서 읽는다. 증분 재실행이
`posting_prevalence` 를 건너뛰어도 쌍의 대상과 기준선이 같아야 하기 때문이다.

`sample_status` 와 `uncertainty` 는 이 모듈이 정하지 않는다. 최소 표본과 억제 정책,
불확실성 방법은 `metric_policy_versions` 가 정하는 값이며 코드 상수가 아니다
(docs/metric-spec.md 6장). 판정은 `SamplePolicy` 로 들어오고, 이 모듈은 정책 행과
카운트를 그대로 넘긴 뒤 돌려받은 판정을 저장한다.

차원이 하나도 없는 상태를 정상으로 취급한다. 냉시작의 활성 분류체계에는 차원이 없고
일곱 family 의 분자가 모두 차원 할당에서 나오므로, 계산할 조합 없음으로 끝난다. 이때
어떤 집계 문장도 실행하지 않는다.
"""

from __future__ import annotations

import hashlib
from collections.abc import Sequence
from typing import TYPE_CHECKING, Any, Protocol

from pydantic import BaseModel, ConfigDict, Field

from careersignal.contracts.run_context import RunContext, StopReason
from careersignal.domain.scope import ScopeLevel
from careersignal.domain.segment import PRIMARY_SEGMENT, SEGMENTED, EntrySegment
from careersignal.metrics import families
from careersignal.metrics import policy as metric_policy
from careersignal.metrics.expansion import (
    Applicability,
    DimensionRef,
    Envelope,
    InputArity,
    MetricCombination,
    MetricFamily,
    MetricTemplate,
    envelopes,
    expand,
)
if TYPE_CHECKING:  # pragma: no cover - 형 검사에서만 필요하다
    from careersignal.repositories.metrics import MetricRepository

# 저장소를 형 이름으로만 쓴다. `repositories/metrics.py` 가 집계 문장을 세우려고
# `metrics/families.py` 를 import 하므로 실행 시점에 여기서 저장소를 다시 import 하면
# 두 모듈이 서로를 기다린다. 주입은 호출자가 하고 이 모듈은 모양만 안다.

NO_ACTIVE_TAXONOMY = "활성 분류체계 버전이 없다"
"""분류체계가 발행되지 않았다. 할당이 없으므로 어떤 분자도 세지 못한다."""

TAXONOMY_MISMATCH = "실행 봉투의 분류체계 버전이 활성 버전과 다르다"
"""봉투가 고정한 버전과 저장소의 활성 버전이 어긋났다. 섞어 집계하지 않는다."""

NO_TEMPLATES = "활성 지표 템플릿이 없다"
"""`metric_templates` 가 비었다. 시드가 일곱 종을 넣으므로 정상 경로에서는 없다."""

NO_POLICY = "이 family 의 지표 정책 버전이 없다"
"""`metric_policy_versions` 에 발효된 행이 없다. 그 family 만 건너뛴다."""

NO_BASELINE = "견줄 posting_prevalence 행이 없다"
"""`cluster_contrast` 의 기업군 값이나 직무 전체 값이 저장되지 않았다."""

ALL_SEGMENTS: tuple[EntrySegment, ...] = (PRIMARY_SEGMENT, *SEGMENTED)
"""전개할 대상군 네 값(docs/metric-spec.md 2.7).

`all` 이 화면과 해석 이후 단계의 기준선이고, 대상군별 행은 함께 계산해 둔다. 표본
상태가 노출 가능한 대상군만 나란히 표시하는 판정은 이후 단계의 몫이다.
"""


class MeasurePoint(BaseModel):
    """표본 판정과 불확실성 계산에 넘기는 한 measure 의 상태.

    `metrics/policy.py` 가 이 값을 받아 `sample_status` 와 `uncertainty` 를 정한다.
    정책 행의 값을 함께 담는 이유는 임계값이 코드 상수가 아니라
    `metric_policy_versions` 의 행이기 때문이다(docs/metric-spec.md 6장). 판정하는 쪽이
    같은 행을 다시 조회하면 실행 도중 발행된 새 정책을 읽어 한 실행 안에서 임계값이
    갈릴 수 있다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    metric_family: str
    measure: str
    metric_policy_version: str
    formula_version: str
    """정책 행이 가리키는 수식 버전. 임계값 판정이 family 와 함께 이 값을 갖는다."""

    minimum_n: int
    minimum_n_comparison: int
    suppression_policy: str
    uncertainty_method: str

    numerator: int | None
    denominator: int | None
    value: float | None
    sample_size: int
    comparison_sample_size: int | None = None
    """함께 견주는 다른 모집단의 분모.

    `cluster_contrast` 만 값을 갖는다. 표본 판정이 기업군 분모와 직무 전체 분모를 둘 다
    보고, 한쪽이라도 `minimum_n_comparison` 에 미달이면 `not_comparable` 이다
    (docs/metric-spec.md 3.4).
    """

    wilson_applicable: bool = False
    """이 measure 가 Wilson 95% 구간을 저장하는가(docs/metric-spec.md 2.5).

    `count` 와 `difference` 를 산출하는 measure 는 불확실성을 저장하지 않는다. 판정은
    `families.WILSON_MEASURES` 가 하고 이 값이 그 결과를 나른다.
    """


SampleVerdict = metric_policy.SampleVerdict
"""표본 판정 하나. 정의는 `metrics/policy.py` 가 갖는다.

같은 개념에 이름을 둘 두지 않는다. 판정의 내용은 정책 모듈이 정하고 이 모듈은 그
결과를 저장할 뿐이므로, 판정 값의 정의도 정책 모듈 하나에 둔다.
"""


class SamplePolicy(Protocol):
    """표본 상태 판정과 불확실성 계산의 확장점.

    구현은 `metrics/policy.py` 가 갖는다(백로그 13-3). 집계는 카운트만 만들고 판정에
    관여하지 않으므로, 정책이 바뀌어도 이 모듈은 바뀌지 않는다.
    """

    def evaluate(self, point: MeasurePoint) -> SampleVerdict:
        ...


class PolicySampler:
    """`metrics/policy.py` 의 판정을 `SamplePolicy` 모양으로 잇는 어댑터.

    두 모듈의 인자 모양이 다르다. 집계는 measure 하나의 상태를 `MeasurePoint` 로 묶어
    넘기고, 정책은 정책 행과 카운트를 따로 받는다. 어댑터를 정책 모듈이 아니라 이쪽에
    두는 이유는 `metrics/policy.py` 가 순수 함수 모듈이기 때문이다. 그쪽에서 이 모듈을
    import 하면 정책이 저장소를 간접으로 끌어온다.

    정책 행을 다시 조회하지 않는다. `MeasurePoint` 가 실행이 고정한 임계값을 싣고
    오므로, 실행 도중 새 정책이 발행돼도 한 실행 안에서 임계값이 갈리지 않는다.
    """

    def evaluate(self, point: MeasurePoint) -> SampleVerdict:
        return metric_policy.evaluate(
            metric_policy.MetricPolicyVersion(
                metric_policy_version=point.metric_policy_version,
                metric_family=point.metric_family,
                formula_version=point.formula_version,
                minimum_n=point.minimum_n,
                minimum_n_comparison=point.minimum_n_comparison,
                suppression_policy=point.suppression_policy,
                uncertainty_method=point.uncertainty_method,
            ),
            measure=point.measure,
            numerator=point.numerator,
            denominator=point.denominator,
            sample_size=point.sample_size,
            comparison_sample_size=point.comparison_sample_size,
            value=point.value,
        )


def fact_identifier(analysis_version: str, key: Sequence[str]) -> str:
    """같은 분석 버전의 같은 조합·measure 는 같은 지표 행이다.

    재료가 `idx_statistics_facts_unique` 와 같다(docs/erd.md 10.5). 재실행이 같은 행을
    가리키므로 중복 삽입이 기본키에서도 막히고, 분석 버전이 다르면 다른 식별자가 되어
    이전 버전의 수치가 그대로 남는다.
    """
    material = ":".join([analysis_version, *key]).encode()
    return f"fact_{hashlib.sha256(material).hexdigest()[:24]}"


class MetricOutcome(BaseModel):
    """집계 실행 하나의 결과."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    agent_run_id: str
    stop_reason: StopReason
    taxonomy_version_id: str | None = None

    template_count: int = 0
    dimension_count: int = 0
    """집계에 넣을 활성 차원 수. 0 이면 냉시작이며 계산할 조합이 없다."""

    envelope_count: int = 0
    """범위 × 대상군 × 기간의 봉투 수."""

    expanded_combinations: int = 0
    skipped_combinations: int = 0
    """이 분석 버전에 이미 결과가 있어 계산하지 않은 조합. 증분 재실행이 여기서 갈린다."""

    computed_combinations: int = 0
    stored_facts: int = 0
    by_family: dict[str, int] = Field(default_factory=dict)
    """family 별 저장 행 수. 나온 것만 담는다."""

    suppressed_values: int = 0
    """판정이 값을 비운 행 수. 행은 저장되고 표본 상태만 남는다."""

    limit_reached: bool = False
    """한도에 닿아 남은 조합을 집지 않았는가.

    참이면 이 실행이 전량을 끝내지 않았다. 남은 조합은 다음 실행이 집는다. 증분
    판정이 이미 저장된 조합을 건너뛰므로 같은 명령을 다시 돌리면 앞으로만 나아간다.
    """

    missing_input: tuple[tuple[str, str], ...] = ()
    """앞선 family 의 결과가 없어 계산하지 못한 조합. `(조합, 사유)` 다."""

    errors: tuple[tuple[str, str], ...] = ()
    """조합 하나의 계산·저장이 실패한 것과 실행 전제의 실패. `(대상, 사유)` 다."""

    halted_reason: str | None = None
    """실행 전제가 깨져 멈춘 사유. 비어 있으면 끝까지 돌았다."""

    @property
    def gained_evidence(self) -> bool:
        return self.stored_facts > 0

    @property
    def halted(self) -> bool:
        return self.halted_reason is not None


class MetricAggregation:
    """지표 family 를 전개해 집계하고 `statistics_facts` 에 남긴다."""

    def __init__(
        self, repository: MetricRepository, sample_policy: SamplePolicy
    ) -> None:
        """`sample_policy` 는 필수다.

        기본 구현을 두지 않는다. 임시값으로 채우면 정책 버전이 정하는 임계값이 아니라
        코드 상수가 표본 상태를 정하게 되고, 그 사실이 저장된 행에서 드러나지 않는다
        (docs/metric-spec.md 6장).
        """
        self._repository = repository
        self._policy = sample_policy

    # ------------------------------------------------------------ 진입점
    def run(
        self,
        context: RunContext,
        period_ids: Sequence[str] | None = None,
        limit: int | None = None,
    ) -> MetricOutcome:
        """증분 실행. 이 분석 버전에 아직 없는 조합만 계산한다.

        같은 봉투로 다시 돌리면 이미 저장된 조합을 건너뛴다. `period_ids` 를 주면 그
        기간만 돌고, 주지 않으면 `periods` 의 전 기간을 돈다.

        `limit` 은 이번 실행이 계산할 조합 수의 상한이다. 이미 저장된 조합을 먼저 뺀 뒤
        남은 것을 앞에서부터 집으므로, 같은 값으로 이어 돌리면 실행마다 앞으로 나아간다.
        한도에 닿으면 `limit_reached` 가 참이 되고 남은 조합은 다음 실행이 집는다.
        전개 순서가 결정적이므로(`metrics/expansion.py`) 어디까지 집었는지를 따로 적어
        둘 필요가 없다.
        """
        active = self._repository.active_taxonomy_version(context.job_role_id)
        if active is None:
            return self._halted(context, NO_ACTIVE_TAXONOMY)

        taxonomy_version_id = str(active["taxonomy_version_id"])
        if (
            context.taxonomy_version_id is not None
            and context.taxonomy_version_id != taxonomy_version_id
        ):
            return self._halted(context, TAXONOMY_MISMATCH, taxonomy_version_id)

        state = _State(context, taxonomy_version_id, limit)
        state.policies = {
            str(row["metric_family"]): dict(row)
            for row in self._repository.effective_policies(context.as_of_date)
        }
        templates = self._templates()
        state.template_count = len(templates)
        if not templates:
            state.errors.append((context.job_role_id, NO_TEMPLATES))
            return state.outcome()

        dimensions = [
            DimensionRef(
                dimension_id=str(row["dimension_id"]),
                role_boundary_eligible=bool(row["role_boundary_eligible"]),
            )
            for row in self._repository.active_dimensions(taxonomy_version_id)
        ]
        state.dimension_count = len(dimensions)
        if not dimensions:
            return state.outcome()

        applicability = Applicability.from_rows(
            self._repository.applicability(taxonomy_version_id)
        )
        scope_envelopes = envelopes(
            self._scopes(context), ALL_SEGMENTS, self._periods(period_ids)
        )
        state.envelope_count = len(scope_envelopes)
        state.existing = self._repository.existing_fact_keys(context.analysis_version)

        self._stage_direct(templates, dimensions, scope_envelopes, applicability, state)
        self._stage_pairs(templates, dimensions, scope_envelopes, applicability, state)
        self._stage_contrast(
            templates, dimensions, scope_envelopes, applicability, state
        )
        return state.outcome()

    # ------------------------------------------------------------ 실행 단계
    def _stage_direct(
        self,
        templates: Sequence[MetricTemplate],
        dimensions: Sequence[DimensionRef],
        scope_envelopes: Sequence[Envelope],
        applicability: Applicability,
        state: _State,
    ) -> None:
        """앞선 결과에 기대지 않는 다섯 family."""
        subset = [
            template
            for template in templates
            if template.metric_family
            not in {
                str(MetricFamily.COOCCURRENCE),
                str(MetricFamily.CLUSTER_CONTRAST),
            }
        ]
        for combination in expand(
            subset, dimensions, scope_envelopes, applicability
        ):
            self._compute(combination, state)

    def _stage_pairs(
        self,
        templates: Sequence[MetricTemplate],
        dimensions: Sequence[DimensionRef],
        scope_envelopes: Sequence[Envelope],
        applicability: Applicability,
        state: _State,
    ) -> None:
        """차원 쌍. 대상을 `posting_prevalence` 의 분자로 자른다.

        조합 폭발을 막기 위해 `posting_prevalence` 가 `minimum_n` 이상인 차원끼리만
        수행한다(docs/metric-spec.md 5장). 임계값은 `posting_prevalence` 의 정책 행에서
        읽는다. 자르는 근거가 그 지표의 결과이므로 그 지표의 최소 표본을 쓴다.
        """
        subset = [
            template
            for template in templates
            if template.metric_family == str(MetricFamily.COOCCURRENCE)
        ]
        if not subset:
            return
        prevalence_policy = state.policies.get(str(MetricFamily.POSTING_PREVALENCE))
        if prevalence_policy is None:
            state.errors.append((str(MetricFamily.COOCCURRENCE), NO_POLICY))
            return

        threshold = int(prevalence_policy["minimum_n"])
        eligible = {
            envelope: [
                dimension_id
                for dimension_id, (numerator, _) in sorted(
                    self._prevalence_of(envelope, state).items()
                )
                if numerator >= threshold
            ]
            for envelope in scope_envelopes
        }
        for combination in expand(
            subset, dimensions, scope_envelopes, applicability, eligible
        ):
            self._compute(combination, state)

    def _stage_contrast(
        self,
        templates: Sequence[MetricTemplate],
        dimensions: Sequence[DimensionRef],
        scope_envelopes: Sequence[Envelope],
        applicability: Applicability,
        state: _State,
    ) -> None:
        """기업군 대비. 저장된 `posting_prevalence` 두 행을 견준다.

        기업군 값과 직무 전체 값을 모두 저장된 행에서 읽는다. 집계 문장을 다시 돌리지
        않는 이유는 두 값이 이미 같은 분석 버전에 같은 정의로 세어져 있기 때문이다.
        다시 세면 그 사이에 적재가 늘었을 때 화면의 `posting_prevalence` 와
        `cluster_contrast` 가 서로 다른 분모를 갖는다.

        한쪽이라도 없으면 조합을 건너뛰고 사유를 남긴다. 적용 불가로 표시된 차원이나
        아직 계산하지 않은 기간이 여기에 해당한다.
        """
        subset = [
            template
            for template in templates
            if template.metric_family == str(MetricFamily.CLUSTER_CONTRAST)
        ]
        if not subset:
            return
        for combination in expand(
            subset, dimensions, scope_envelopes, applicability
        ):
            self._contrast(combination, state)

    # ------------------------------------------------------------ 조합 하나
    def _compute(self, combination: MetricCombination, state: _State) -> None:
        """집계 문장을 돌려 measure 를 만들고 저장한다."""
        state.expanded += 1
        family = MetricFamily(combination.metric_family)
        policy = state.policies.get(combination.metric_family)
        if policy is None:
            state.errors.append((combination.metric_family, NO_POLICY))
            return
        if state.already_done(combination, family):
            state.skipped += 1
            return
        if state.reached_limit():
            return

        params = self._params(combination, state)
        try:
            results = self._measures(family, params)
        except Exception as exc:
            state.errors.append((_label(combination), _failure(exc)))
            return
        state.computed += 1
        self._store(combination, results, policy, state)

    def _contrast(self, combination: MetricCombination, state: _State) -> None:
        """`cluster_contrast` 조합 하나(docs/metric-spec.md 3.4)."""
        state.expanded += 1
        family = MetricFamily.CLUSTER_CONTRAST
        policy = state.policies.get(str(family))
        if policy is None:
            state.errors.append((str(family), NO_POLICY))
            return
        if state.already_done(combination, family):
            state.skipped += 1
            return
        if state.reached_limit():
            return

        envelope = combination.envelope
        baseline_envelope = Envelope(
            scope_level=ScopeLevel.OVERALL,
            scope_id=state.context.job_role_id,
            entry_segment=envelope.entry_segment,
            period_id=envelope.period_id,
        )
        cluster = self._prevalence_of(envelope, state).get(combination.dimension_id)
        baseline = self._prevalence_of(baseline_envelope, state).get(
            combination.dimension_id
        )
        if cluster is None or baseline is None:
            state.missing_input.append((_label(combination), NO_BASELINE))
            return

        state.computed += 1
        results = families.cluster_contrast(
            cluster_numerator=cluster[0],
            cluster_denominator=cluster[1],
            baseline_numerator=baseline[0],
            baseline_denominator=baseline[1],
        )
        self._store(combination, results, policy, state)

    def _measures(
        self, family: MetricFamily, params: dict[str, Any]
    ) -> tuple[families.MeasureResult, ...]:
        """family 마다 카운트를 조회해 measure 로 옮긴다.

        분자·분모의 정의는 `metrics/families.py` 가 갖는다. 이 자리는 어느 조회를 어느
        판정 함수에 잇는지만 정한다.
        """
        match family:
            case MetricFamily.POSTING_PREVALENCE:
                row = self._repository.prevalence_counts(params)
                return families.prevalence(
                    int(row["numerator"]), int(row["denominator"])
                )
            case MetricFamily.REQUIREDNESS_RATIO:
                row = self._repository.requiredness_counts(params)
                return families.requiredness(
                    int(row["numerator"]), int(row["denominator"])
                )
            case MetricFamily.DEPTH_DISTRIBUTION:
                row = self._repository.depth_counts(params)
                return families.depth_distribution(
                    int(row["foundation"]),
                    int(row["application"]),
                    int(row["tradeoff"]),
                    int(row["denominator"]),
                )
            case MetricFamily.COOCCURRENCE:
                row = self._repository.cooccurrence_counts(params)
                return families.cooccurrence(
                    int(row["n_ab"]),
                    int(row["n_a"]),
                    int(row["n_b"]),
                    int(row["n_total"]),
                )
            case MetricFamily.SCOPE_EXPANSION:
                row = self._repository.scope_expansion_counts(params)
                return families.scope_expansion(
                    int(row["numerator"]), int(row["denominator"])
                )
            case MetricFamily.ENTRY_LABEL_ADVANCED_SIGNAL_RATE:
                row = self._repository.advanced_signal_counts(params)
                return families.advanced_signal_rate(
                    int(row["numerator"]), int(row["denominator"])
                )
        raise ValueError(f"집계 문장이 없는 지표: {family}")

    # ------------------------------------------------------------ 저장
    def _store(
        self,
        combination: MetricCombination,
        results: Sequence[families.MeasureResult],
        policy: dict[str, Any],
        state: _State,
    ) -> None:
        """measure 마다 한 행. 이미 있는 measure 는 다시 넣지 않는다."""
        family = MetricFamily(combination.metric_family)
        wilson = families.WILSON_MEASURES[family]
        for result in results:
            key = combination.fact_key(result.measure)
            if key in state.existing:
                continue
            point = MeasurePoint(
                metric_family=combination.metric_family,
                measure=result.measure,
                metric_policy_version=str(policy["metric_policy_version"]),
                formula_version=str(policy["formula_version"]),
                minimum_n=int(policy["minimum_n"]),
                minimum_n_comparison=int(policy["minimum_n_comparison"]),
                suppression_policy=str(policy["suppression_policy"]),
                uncertainty_method=str(policy["uncertainty_method"]),
                numerator=result.numerator,
                denominator=result.denominator,
                value=result.value,
                sample_size=result.sample_size,
                comparison_sample_size=result.comparison_sample_size,
                wilson_applicable=result.measure in wilson,
            )
            try:
                verdict = self._policy.evaluate(point)
            except Exception as exc:
                state.errors.append((_label(combination), _failure(exc)))
                return
            if verdict.suppressed:
                state.suppressed += 1
            try:
                self._repository.add_fact(
                    _fact_row(state.context, combination, point, verdict)
                )
            except Exception as exc:
                state.errors.append((_label(combination), _failure(exc)))
                continue
            state.existing.add(key)
            state.stored += 1
            state.by_family[combination.metric_family] = (
                state.by_family.get(combination.metric_family, 0) + 1
            )

    # ------------------------------------------------------------ 입력
    def _templates(self) -> list[MetricTemplate]:
        """`metric_templates` 를 전개가 쓰는 모양으로 옮긴다.

        일곱 종에 없는 family 는 뺀다. `temporal_delta` 처럼 독립 지표가 아닌 것이 표에
        더해져도 이 실행이 집계 문장을 찾지 못한 채로 넘어지지 않게 한다.
        """
        known = {str(family) for family in MetricFamily}
        return [
            MetricTemplate(
                metric_family=str(row["metric_family"]),
                formula_version=str(row["formula_version"]),
                input_arity=InputArity(str(row["input_arity"])),
                output_unit=str(row["output_unit"]),
            )
            for row in self._repository.metric_templates()
            if str(row["metric_family"]) in known
        ]

    def _scopes(self, context: RunContext) -> list[tuple[ScopeLevel, str]]:
        """전개할 범위.

        봉투가 직무 전체면 직무 전체와 이 데이터셋에 공고가 있는 기업군을 함께 돈다.
        봉투가 좁은 범위를 지정하면 그 범위만 돈다. 사용자 공고 직접 입력처럼 범위가
        하나로 고정된 실행이 전 기업군을 다시 세지 않게 한다.

        `overall` 의 `scope_id` 는 직무 식별자다. `statistics_facts.scope_id` 가
        NOT NULL 이므로 가리킬 대상이 필요하고, 직무 전체라는 사실은 `scope_level` 이
        이미 말한다.
        """
        if context.scope_level is not ScopeLevel.OVERALL:
            return [(context.scope_level, str(context.scope_id))]
        clusters = self._repository.cluster_scopes(
            context.job_role_id, context.dataset_version, context.as_of_date
        )
        return [
            (ScopeLevel.OVERALL, context.job_role_id),
            *((ScopeLevel.CLUSTER, cluster_id) for cluster_id in clusters),
        ]

    def _periods(self, period_ids: Sequence[str] | None) -> list[str]:
        if period_ids is not None:
            return list(period_ids)
        return self._repository.periods()

    def _prevalence_of(
        self, envelope: Envelope, state: _State
    ) -> dict[str, tuple[int, int]]:
        """봉투 하나의 `posting_prevalence` 결과. 실행 안에서 한 번만 조회한다."""
        cached = state.prevalence.get(envelope)
        if cached is None:
            cached = self._repository.prevalence_facts(
                state.context.analysis_version,
                str(envelope.scope_level),
                envelope.scope_id,
                str(envelope.entry_segment),
                envelope.period_id,
            )
            state.prevalence[envelope] = cached
        return cached

    def _params(
        self, combination: MetricCombination, state: _State
    ) -> dict[str, Any]:
        """집계 문장의 자리표시자.

        `entry_labels` 는 대상군을 `entry_label` 목록으로 편 것이며 `all` 이면 NULL 이다
        (docs/metric-spec.md 2.7). `as_of_date` 는 기업군 소속을 해석하는 시점이다
        (docs/statistics-model.md 5.2).
        """
        envelope = combination.envelope
        labels = families.segment_labels(envelope.entry_segment)
        return {
            "job_role_id": state.context.job_role_id,
            "dataset_version": state.context.dataset_version,
            "taxonomy_version_id": state.taxonomy_version_id,
            "period_id": envelope.period_id,
            "scope_level": str(envelope.scope_level),
            "scope_id": envelope.scope_id,
            "as_of_date": state.context.as_of_date,
            "entry_labels": list(labels) if labels is not None else None,
            "dimension_id": combination.dimension_id,
            "secondary_dimension_id": combination.secondary_dimension_id,
        }

    # ------------------------------------------------------------ 실패
    def _halted(
        self,
        context: RunContext,
        reason: str,
        taxonomy_version_id: str | None = None,
    ) -> MetricOutcome:
        """실행 전제가 깨진 결과. 계산할 것 없음과 구분한다."""
        return MetricOutcome(
            agent_run_id=context.agent_run_id,
            stop_reason=StopReason.EXPLICIT_FAILURE,
            taxonomy_version_id=taxonomy_version_id,
            halted_reason=reason,
            errors=((context.job_role_id, reason),),
        )


class _State:
    """실행 하나가 쌓는 값. 결과 모델로 굳히기 전의 가변 상태다."""

    def __init__(
        self,
        context: RunContext,
        taxonomy_version_id: str,
        limit: int | None = None,
    ) -> None:
        self.context = context
        self.taxonomy_version_id = taxonomy_version_id
        self.limit = limit
        self.limit_reached = False

        self.template_count = 0
        self.dimension_count = 0
        self.envelope_count = 0

        self.expanded = 0
        self.skipped = 0
        self.computed = 0
        self.stored = 0
        self.suppressed = 0

        self.policies: dict[str, dict[str, Any]] = {}
        self.existing: set[tuple[str, ...]] = set()
        self.prevalence: dict[Envelope, dict[str, tuple[int, int]]] = {}

        self.by_family: dict[str, int] = {}
        self.missing_input: list[tuple[str, str]] = []
        self.errors: list[tuple[str, str]] = []

    def reached_limit(self) -> bool:
        """이번 실행의 한도를 다 썼는가. 닿은 사실을 결과에 남긴다.

        건너뛴 조합은 세지 않는다. 한도는 계산할 조합의 수이지 전개할 조합의 수가
        아니며, 이미 저장된 조합을 세면 이어 돌리는 실행이 앞으로 나아가지 못한다.
        """
        if self.limit is None or self.computed < self.limit:
            return False
        self.limit_reached = True
        return True

    def already_done(
        self, combination: MetricCombination, family: MetricFamily
    ) -> bool:
        """반드시 만드는 measure 가 모두 있으면 다시 계산하지 않는다.

        조건 없이 만드는 measure 만 본다. `cluster_contrast` 의 `prevalence_ratio` 는
        직무 전체 비율이 0 이면 만들지 않으므로(docs/metric-spec.md 3.4) 없는 것을
        미완으로 읽으면 같은 조합을 매 실행 다시 계산한다.
        """
        return all(
            combination.fact_key(measure) in self.existing
            for measure in families.REQUIRED_MEASURES[family]
        )

    def outcome(self) -> MetricOutcome:
        return MetricOutcome(
            agent_run_id=self.context.agent_run_id,
            stop_reason=_stop_reason(
                expanded=self.expanded,
                stored=self.stored,
                errors=bool(self.errors),
            ),
            taxonomy_version_id=self.taxonomy_version_id,
            template_count=self.template_count,
            dimension_count=self.dimension_count,
            envelope_count=self.envelope_count,
            expanded_combinations=self.expanded,
            skipped_combinations=self.skipped,
            computed_combinations=self.computed,
            stored_facts=self.stored,
            by_family=dict(self.by_family),
            suppressed_values=self.suppressed,
            limit_reached=self.limit_reached,
            missing_input=tuple(self.missing_input),
            errors=tuple(self.errors),
        )


def _fact_row(
    context: RunContext,
    combination: MetricCombination,
    point: MeasurePoint,
    verdict: SampleVerdict,
) -> dict[str, Any]:
    """저장할 지표 한 줄. 컬럼은 docs/erd.md 10.5 다.

    수치 여섯 컬럼은 판정이 돌려준 값을 그대로 옮긴다. 억제와 계산 불가에서 `value` 를
    비우는 것은 판정의 몫이며(docs/metric-spec.md 2.4), 저장하는 쪽이 같은 규칙을 다시
    적으면 두 벌이 어긋났을 때 `statistics_facts` 의 `not_computable_has_no_value`
    CHECK 로만 드러난다.
    """
    envelope = combination.envelope
    return {
        "fact_id": fact_identifier(
            context.analysis_version, combination.fact_key(point.measure)
        ),
        "analysis_version": context.analysis_version,
        "metric_family": combination.metric_family,
        "metric_policy_version": point.metric_policy_version,
        "scope_level": str(envelope.scope_level),
        "scope_id": envelope.scope_id,
        "entry_segment": str(envelope.entry_segment),
        "period_id": envelope.period_id,
        "dimension_id": combination.dimension_id,
        "secondary_dimension_id": combination.secondary_dimension_id,
        "measure": point.measure,
        **verdict.fact_columns(),
    }


def _label(combination: MetricCombination) -> str:
    """실패 목록에 적을 조합 이름. 사유별로 묶어 읽을 수 있게 짧게 둔다."""
    return ":".join(combination.fact_key(""))


def _failure(exc: BaseException) -> str:
    """예외 하나를 결과에 적을 한 줄로 옮긴다."""
    return f"{type(exc).__name__}: {exc}"


def _stop_reason(expanded: int, stored: int, errors: bool) -> StopReason:
    """docs/agent-design.md 11.1의 종료 조건을 판정한다.

    순서가 의미를 갖는다. 계산이나 저장이 깨진 실행을 근거 없음으로 볼 수 없고, 차원이
    없어 조합을 만들지 못한 실행은 실패가 아니라 더 볼 것이 없는 상태다. 예산 소진은
    쓰지 않는다. 집계에 외부 호출이 없어 봉투의 한도에 걸릴 자리가 없다.
    """
    if errors:
        return StopReason.EXPLICIT_FAILURE
    if not expanded:
        return StopReason.FRONTIER_EXHAUSTED
    if stored:
        return StopReason.SLOTS_FILLED
    return StopReason.NO_NEW_EVIDENCE


__all__ = [
    "ALL_SEGMENTS",
    "NO_ACTIVE_TAXONOMY",
    "NO_BASELINE",
    "NO_POLICY",
    "NO_TEMPLATES",
    "TAXONOMY_MISMATCH",
    "MeasurePoint",
    "MetricAggregation",
    "MetricOutcome",
    "PolicySampler",
    "SamplePolicy",
    "SampleVerdict",
    "fact_identifier",
]
