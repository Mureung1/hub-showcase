"""지표 family 실행과 저장.

절차는 docs/statistics-model.md 5.1 의 집계 파이프라인이고, 수식은
docs/metric-spec.md 3장, 저장 자리는 docs/erd.md 10.5 다.

집계는 결정적으로 수행한다. 생성 모델은 수치를 산출하지 않으므로 이 실행에 모델 호출이
없다(docs/statistics-model.md 5.1). 실행은 조합을 전개하고, SQL 로 카운트를 얻고,
카운트를 measure 행으로 옮겨 저장하는 세 단계다. 앞의 둘은 순수 함수와 저장소가 나눠
갖고 이 모듈은 순서를 정한다.

조회와 저장을 모두 묶는다. 원격 저장소에서는 왕복 하나가 수십 밀리초이므로 조합마다
질의 하나·행마다 삽입 하나면 왕복 수가 실행 시간을 정한다. 집계 질의는 봉투 하나에 한
번씩 보내 `GROUP BY dimension_id` 로 차원 전부를 한 번에 세고(`metrics/families.py` 의
묶음 조각), 저장은 `INSERT_BATCH_SIZE` 행씩 한 문장으로 보낸다. 결과는 묶기 전과 같다.
차원별 카운트는 왼쪽 바깥 조인이 빈 차원을 0 으로 채우고, 저장은 묶음이 실패하면 그
묶음만 한 줄씩 다시 시도해 나쁜 행만 골라낸다.

단계를 셋으로 나눈다. 앞선 family 의 결과를 뒤가 입력으로 쓰기 때문이다.

1. `posting_prevalence`·`requiredness_ratio`·`depth_distribution`·`scope_expansion`·
   `entry_label_advanced_signal_rate`. 서로 기대지 않는다.
2. `cooccurrence`. 차원 쌍의 전개가 `posting_prevalence` 의 분자로 대상을 자른다
   (docs/metric-spec.md 5장).
3. `cluster_contrast`. 기업군과 직무 전체의 `posting_prevalence` 를 견준다
   (같은 문서 3.4).

뒤 두 단계의 입력은 메모리가 아니라 저장된 행에서 읽는다. 증분 재실행이
`posting_prevalence` 를 건너뛰어도 쌍의 대상과 기준선이 같아야 하기 때문이다. 그래서
단계가 끝날 때마다 모아 둔 행을 먼저 저장한다. 저장을 실행 끝까지 미루면 뒤 두 단계가
같은 거래에서 방금 만든 `posting_prevalence` 를 찾지 못한다.

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
from collections.abc import Callable, Sequence
from typing import TYPE_CHECKING, Any, NamedTuple, Protocol

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
from careersignal.repositories.base import INSERT_BATCH_SIZE, insert_in_batches

if TYPE_CHECKING:  # pragma: no cover - 형 검사에서만 필요하다
    from careersignal.repositories.metrics import MetricRepository

# 저장소를 형 이름으로만 쓴다. `repositories/metrics.py` 가 집계 문장을 세우려고
# `metrics/families.py` 를 import 하므로 실행 시점에 여기서 저장소를 다시 import 하면
# 두 모듈이 서로를 기다린다. 주입은 호출자가 하고 이 모듈은 모양만 안다.
#
# `repositories/base.py` 는 예외다. 저장소 기반은 `domain/permissions.py` 만 보고
# `metrics/` 를 전혀 import 하지 않으므로 서로를 기다릴 자리가 없다. 항목 하나의
# 되돌림 지점과 거래 사망 판정을 지표 실행도 써야 하고, 그 정의를 여기 베끼면 두
# 자리가 갈린다.

TRANSACTION_LOST = "거래가 죽어 남은 지표를 저장하지 못한다"
"""저장이 거래를 죽이는 실패를 냈다. 남은 조합을 시도하지 않고 멈춘 사유다.

PostgreSQL 은 거래 안에서 오류가 나면 남은 명령을 전부 거부한다. 죽은 거래에 계속
저장하면 같은 사유의 실패 줄이 조합 수만큼 쌓인다. 저장하지 못한 조합은
`metric_facts` 에 자국이 없으므로 다음 실행이 다시 계산한다.
"""

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

MISSING_DIMENSION_COUNT = "묶음 조회가 이 차원의 카운트를 돌려주지 않았다"
"""봉투의 묶음 결과에 조합의 차원이 없다.

차원 목록을 배열로 넘기고 왼쪽 바깥 조인으로 채우므로(`metrics/families.py` 의
`DIMENSION_LIST_CTE`) 정상 경로에서는 없다. 없는 것을 0 으로 읽지 않는다. 분자 0 은
그 차원이 한 공고에도 나타나지 않았다는 자료이고, 행이 빠진 것은 조회가 목록을 지키지
않았다는 뜻이라 둘을 같게 두면 조회의 결함이 수치로 굳는다.
"""

ProgressReport = Callable[[int, int], None]
"""진행 상황을 받는 쪽. `(처리한 조합 수, 전개한 조합 수)` 를 받는다.

간격을 정하고 줄을 찍는 것은 받는 쪽의 몫이다. 실행이 출력 형식을 정하면 같은 실행을
다른 화면에 붙일 수 없다.
"""


class _PendingFact(NamedTuple):
    """저장을 기다리는 지표 행 하나.

    행만 모으지 않고 실패를 적을 이름과 증분 판정에 쓸 키를 함께 나른다. 묶음 저장은
    어느 행이 실패했는지를 번호로 돌려주므로, 번호에서 이름과 키로 되짚을 자리가 있어야
    한다.
    """

    label: str
    key: tuple[str, ...]
    metric_family: str
    row: dict[str, Any]


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
        progress: ProgressReport | None = None,
    ) -> MetricOutcome:
        """증분 실행. 이 분석 버전에 아직 없는 조합만 계산한다.

        같은 봉투로 다시 돌리면 이미 저장된 조합을 건너뛴다. `period_ids` 를 주면 그
        기간만 돌고, 주지 않으면 `periods` 의 전 기간을 돈다.

        `limit` 은 이번 실행이 계산할 조합 수의 상한이다. 이미 저장된 조합을 먼저 뺀 뒤
        남은 것을 앞에서부터 집으므로, 같은 값으로 이어 돌리면 실행마다 앞으로 나아간다.
        한도에 닿으면 `limit_reached` 가 참이 되고 남은 조합은 다음 실행이 집는다.
        전개 순서가 결정적이므로(`metrics/expansion.py`) 어디까지 집었는지를 따로 적어
        둘 필요가 없다.

        `progress` 는 조합 하나를 처리할 때마다 `(처리한 수, 전개한 수)` 를 받는다.
        조합이 만 단위라 끝날 때까지 화면이 비면 멈춘 실행과 구분되지 않는다. 간격을
        정하고 줄을 찍는 것은 받는 쪽의 몫이다(`scripts/stage_e.py` 의
        `report_progress`). 두 번째 수는 단계가 시작될 때마다 그 단계의 전개 수만큼
        늘어난다. 차원 쌍의 수가 `posting_prevalence` 의 결과에 달려 있어
        (docs/metric-spec.md 5장) 첫 단계 전에는 전량을 알 수 없기 때문이며, 알지 못하는
        수를 지어내 찍지 않는다.
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

        state = _State(context, taxonomy_version_id, limit, progress)
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
        state.dimension_ids = tuple(
            sorted({dimension.dimension_id for dimension in dimensions})
        )

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
        combinations = expand(subset, dimensions, scope_envelopes, applicability)
        state.plan(len(combinations))
        for combination in combinations:
            self._compute(combination, state)
        self._flush(state)

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
        state.eligible = {
            envelope: tuple(dimension_ids)
            for envelope, dimension_ids in eligible.items()
        }
        combinations = expand(
            subset, dimensions, scope_envelopes, applicability, eligible
        )
        state.plan(len(combinations))
        for combination in combinations:
            self._compute(combination, state)
        self._flush(state)

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
        combinations = expand(subset, dimensions, scope_envelopes, applicability)
        state.plan(len(combinations))
        for combination in combinations:
            self._contrast(combination, state)
        self._flush(state)

    # ------------------------------------------------------------ 조합 하나
    def _compute(self, combination: MetricCombination, state: _State) -> None:
        """집계 문장을 돌려 measure 를 만들고 저장할 행에 담는다."""
        state.expanded += 1
        state.advance()
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

        try:
            results = self._measures(family, combination, state)
        except Exception as exc:
            state.errors.append((_label(combination), _failure(exc)))
            return
        state.computed += 1
        self._store(combination, results, policy, state)

    def _contrast(self, combination: MetricCombination, state: _State) -> None:
        """`cluster_contrast` 조합 하나(docs/metric-spec.md 3.4)."""
        state.expanded += 1
        state.advance()
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
        self,
        family: MetricFamily,
        combination: MetricCombination,
        state: _State,
    ) -> tuple[families.MeasureResult, ...]:
        """family 마다 카운트를 얻어 measure 로 옮긴다.

        분자·분모의 정의는 `metrics/families.py` 가 갖는다. 이 자리는 어느 조회를 어느
        판정 함수에 잇는지만 정한다.

        차원 축을 갖는 네 family 는 봉투 하나의 결과를 통째로 받아 그 안에서 이 조합의
        차원을 찾는다. 차원을 받지 않는 두 family 는 봉투마다 조합이 하나뿐이라 묶을
        축이 없으므로 그대로 조회한다.
        """
        envelope = combination.envelope
        match family:
            case MetricFamily.POSTING_PREVALENCE:
                row = self._dimension_row(family, combination, state)
                return families.prevalence(
                    int(row["numerator"]), int(row["denominator"])
                )
            case MetricFamily.REQUIREDNESS_RATIO:
                row = self._dimension_row(family, combination, state)
                return families.requiredness(
                    int(row["numerator"]), int(row["denominator"])
                )
            case MetricFamily.DEPTH_DISTRIBUTION:
                row = self._dimension_row(family, combination, state)
                return families.depth_distribution(
                    int(row["foundation"]),
                    int(row["application"]),
                    int(row["tradeoff"]),
                    int(row["denominator"]),
                )
            case MetricFamily.COOCCURRENCE:
                return self._pair_measures(combination, state)
            case MetricFamily.SCOPE_EXPANSION:
                row = self._repository.scope_expansion_counts(
                    self._params(envelope, state)
                )
                return families.scope_expansion(
                    int(row["numerator"]), int(row["denominator"])
                )
            case MetricFamily.ENTRY_LABEL_ADVANCED_SIGNAL_RATE:
                row = self._repository.advanced_signal_counts(
                    self._params(envelope, state)
                )
                return families.advanced_signal_rate(
                    int(row["numerator"]), int(row["denominator"])
                )
        raise ValueError(f"집계 문장이 없는 지표: {family}")

    def _pair_measures(
        self, combination: MetricCombination, state: _State
    ) -> tuple[families.MeasureResult, ...]:
        """차원 쌍 하나의 네 카운트(docs/metric-spec.md 3.5).

        `n_ab` 만 쌍 조회에서 온다. `n_a`·`n_b` 는 두 차원의 `posting_prevalence` 분자,
        `n_total` 은 그 분모이며 같은 봉투에서 이미 세어져 있다. 같은 수를 두 번 세지
        않으므로 `jaccard` 의 분모가 분자보다 작아질 수 없다.

        쌍 조회에 없는 쌍은 교집합이 0 이다. 두 차원이 한 공고에서도 함께 나타나지
        않았다는 뜻이며, 쌍마다 문장을 보내던 때에도 `n_ab` 가 0 이었다.
        """
        envelope = combination.envelope
        left = str(combination.dimension_id)
        right = str(combination.secondary_dimension_id)
        pairs = self._pair_counts(envelope, state)
        singles = self._counts(MetricFamily.POSTING_PREVALENCE, envelope, state)
        return families.cooccurrence(
            pairs.get((left, right), 0),
            int(_dimension_of(singles, left, envelope)["numerator"]),
            int(_dimension_of(singles, right, envelope)["numerator"]),
            int(_dimension_of(singles, left, envelope)["denominator"]),
        )

    # ------------------------------------------------------------ 묶음 조회
    def _dimension_row(
        self,
        family: MetricFamily,
        combination: MetricCombination,
        state: _State,
    ) -> dict[str, Any]:
        """이 조합의 차원 한 줄. 봉투의 묶음 결과에서 찾는다."""
        envelope = combination.envelope
        counts = self._counts(family, envelope, state)
        return _dimension_of(counts, str(combination.dimension_id), envelope)

    def _counts(
        self, family: MetricFamily, envelope: Envelope, state: _State
    ) -> dict[str, dict[str, Any]]:
        """봉투 하나의 차원별 카운트. 실행 안에서 봉투마다 한 번만 조회한다.

        `cooccurrence` 가 `posting_prevalence` 의 결과를 다시 쓰므로 기억해 둔다. 같은
        거래 안에서 원천 표가 바뀌지 않으니 기억한 값과 다시 읽은 값이 다를 수 없다.

        조회를 미뤄 두는 것이 증분 재실행의 전제다. 이미 저장된 조합은 `_compute` 가
        문장에 닿기 전에 건너뛰므로, 봉투의 조합이 전부 저장돼 있으면 그 봉투의 문장은
        한 번도 나가지 않는다.
        """
        key = (str(family), envelope)
        cached = state.counts.get(key)
        if cached is None:
            rows = self._count_rows(
                family, self._params(envelope, state, state.dimension_ids)
            )
            cached = {str(row["dimension_id"]): dict(row) for row in rows}
            state.counts[key] = cached
        return cached

    def _count_rows(
        self, family: MetricFamily, params: dict[str, Any]
    ) -> Sequence[dict[str, Any]]:
        """차원 축을 갖는 세 family 의 묶음 조회."""
        match family:
            case MetricFamily.POSTING_PREVALENCE:
                return self._repository.prevalence_counts_by_dimension(params)
            case MetricFamily.REQUIREDNESS_RATIO:
                return self._repository.requiredness_counts_by_dimension(params)
            case MetricFamily.DEPTH_DISTRIBUTION:
                return self._repository.depth_counts_by_dimension(params)
        raise ValueError(f"차원별 집계 문장이 없는 지표: {family}")

    def _pair_counts(
        self, envelope: Envelope, state: _State
    ) -> dict[tuple[str, str], int]:
        """봉투 하나의 쌍별 교집합 크기. 봉투마다 한 번만 조회한다.

        대상은 그 봉투에서 쌍을 만들 수 있는 차원뿐이다(docs/metric-spec.md 5장). 쌍은
        차원 수의 제곱으로 늘므로 자르지 않은 목록을 넘기면 세지 않을 쌍까지 센다.
        """
        cached = state.pairs.get(envelope)
        if cached is None:
            eligible = state.eligible.get(envelope, ())
            cached = {
                (
                    str(row["dimension_id"]),
                    str(row["secondary_dimension_id"]),
                ): int(row["n_ab"])
                for row in self._repository.cooccurrence_pair_counts(
                    self._params(envelope, state, eligible)
                )
            }
            state.pairs[envelope] = cached
        return cached

    # ------------------------------------------------------------ 저장
    def _store(
        self,
        combination: MetricCombination,
        results: Sequence[families.MeasureResult],
        policy: dict[str, Any],
        state: _State,
    ) -> None:
        """measure 마다 한 행. 이미 있는 measure 는 다시 넣지 않는다.

        여기서 넣지 않고 모아 둔다. 저장은 `_flush` 가 묶어 보내며 단계가 끝날 때마다
        불린다. 행마다 문장을 보내면 왕복이 저장 행 수만큼이고, 21,676행이면 그 왕복이
        실행 시간의 거의 전부가 된다.
        """
        family = MetricFamily(combination.metric_family)
        wilson = families.WILSON_MEASURES[family]
        for result in results:
            key = combination.fact_key(result.measure)
            if key in state.existing or key in state.queued:
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
            state.queued.add(key)
            state.pending.append(
                _PendingFact(
                    label=_label(combination),
                    key=key,
                    metric_family=combination.metric_family,
                    row=_fact_row(state.context, combination, point, verdict),
                )
            )
        if len(state.pending) >= INSERT_BATCH_SIZE:
            self._flush(state, final=False)

    def _flush(self, state: _State, final: bool = True) -> None:
        """모아 둔 지표 행을 묶어 저장한다.

        세이브포인트의 단위가 묶음이고, 되돌아간 묶음은 한 줄씩 다시 넣어 나쁜 행만
        골라낸다(`repositories/base.py` 의 `insert_in_batches`). 그래서 저장되는 행
        집합이 행마다 세이브포인트를 잡던 것과 같다. 실패한 행은 `existing` 에 들지 않아
        자국이 없고 다음 실행이 다시 계산한다.

        거래가 죽으면 그 자리에서 멈춘다. 죽은 거래에 계속 넣으면 같은 사유의 실패 줄이
        행 수만큼 쌓이고 무엇이 진짜 원인이었는지 묻힌다.

        `final` 이 거짓이면 꽉 찬 묶음만 보내고 나머지를 남긴다. 조합 하나가 measure
        다섯 줄을 낳으므로 모아 둔 수가 묶음 크기를 조금씩 넘고, 넘긴 채로 보내면 묶음
        하나가 꽉 찬 것과 몇 줄짜리 꼬리로 갈려 문장 수가 두 배가 된다. 단계가 끝날 때만
        꼬리까지 보낸다. 뒤 단계가 그 행을 읽어야 하기 때문이다.
        """
        if state.transaction_lost:
            # 죽은 거래에 남은 행을 더 보내면 같은 사유의 실패 줄만 쌓인다.
            state.pending = []
            return
        pending = state.pending
        size = (
            len(pending) if final else len(pending) - len(pending) % INSERT_BATCH_SIZE
        )
        if not size:
            return
        pending, state.pending = pending[:size], pending[size:]
        written = insert_in_batches(
            self._repository,
            self._repository.add_facts,
            self._repository.add_fact,
            [item.row for item in pending],
        )
        for index in written.stored:
            item = pending[index]
            state.existing.add(item.key)
            state.stored += 1
            state.by_family[item.metric_family] = (
                state.by_family.get(item.metric_family, 0) + 1
            )
        for index, exc in written.failed:
            state.errors.append((pending[index].label, _failure(exc)))
        if written.fatal is not None:
            last = pending[written.failed[-1][0]]
            state.errors.append((last.label, TRANSACTION_LOST))
            state.transaction_lost = True

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
        self,
        envelope: Envelope,
        state: _State,
        dimension_ids: Sequence[str] = (),
    ) -> dict[str, Any]:
        """집계 문장의 자리표시자. 조합이 아니라 봉투가 단위다.

        `entry_labels` 는 대상군을 `entry_label` 목록으로 편 것이며 `all` 이면 NULL 이다
        (docs/metric-spec.md 2.7). `as_of_date` 는 기업군 소속을 해석하는 시점이다
        (docs/statistics-model.md 5.2).

        `dimension_ids` 는 이번 문장이 값을 받아야 할 차원 목록이다. 차원 축이 없는
        문장은 비운다. 차원 하나를 자리표시자로 넘기던 자리를 목록으로 바꾼 것이며,
        그래서 봉투 하나에 문장 하나면 그 봉투의 차원 전부가 채워진다.
        """
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
            "dimension_ids": list(dimension_ids),
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
        progress: ProgressReport | None = None,
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

        self.dimension_ids: tuple[str, ...] = ()
        """집계에 넣을 활성 차원 전부. 차원별 묶음 조회의 배열 매개변수다."""

        self.eligible: dict[Envelope, tuple[str, ...]] = {}
        """봉투마다 차원 쌍을 만들 수 있는 차원(docs/metric-spec.md 5장)."""

        self.counts: dict[tuple[str, Envelope], dict[str, dict[str, Any]]] = {}
        self.pairs: dict[Envelope, dict[tuple[str, str], int]] = {}
        """봉투 하나에 한 번씩만 조회하도록 기억해 둔 묶음 결과."""

        self.pending: list[_PendingFact] = []
        self.queued: set[tuple[str, ...]] = set()
        """저장을 기다리는 행과 그 키.

        키를 따로 두는 이유는 `existing` 이 저장에 성공한 행만 담기 때문이다. 아직 넣지
        않은 행을 `existing` 에 미리 담으면 저장이 실패한 행이 저장된 것으로 읽힌다.
        """

        self.by_family: dict[str, int] = {}
        self.missing_input: list[tuple[str, str]] = []
        self.errors: list[tuple[str, str]] = []
        self.transaction_lost = False
        """거래가 죽었는가. 참이면 남은 조합을 계산하지도 저장하지도 않는다."""

        self.planned = 0
        self.processed = 0
        self.report = progress
        """진행 상황을 받는 쪽. 없으면 아무것도 알리지 않는다."""

    # ------------------------------------------------------------ 진행
    def plan(self, count: int) -> None:
        """이 단계가 전개한 조합 수를 알린 총량에 더한다."""
        self.planned += count

    def advance(self) -> None:
        """조합 하나를 처리했다. 간격을 정하는 것은 받는 쪽의 몫이다."""
        self.processed += 1
        if self.report is not None:
            self.report(self.processed, self.planned)

    def reached_limit(self) -> bool:
        """이번 실행의 한도를 다 썼거나 거래가 죽었는가. 사실을 결과에 남긴다.

        건너뛴 조합은 세지 않는다. 한도는 계산할 조합의 수이지 전개할 조합의 수가
        아니며, 이미 저장된 조합을 세면 이어 돌리는 실행이 앞으로 나아가지 못한다.

        거래가 죽은 뒤에는 한도와 무관하게 참이다. 죽은 거래에 계속 저장하면 같은
        사유의 실패 줄만 조합 수만큼 쌓인다.
        """
        if self.transaction_lost:
            return True
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


def _dimension_of(
    counts: dict[str, dict[str, Any]], dimension_id: str, envelope: Envelope
) -> dict[str, Any]:
    """묶음 결과에서 차원 하나의 줄을 꺼낸다. 없으면 계산하지 않고 실패로 남긴다."""
    row = counts.get(dimension_id)
    if row is None:
        raise ValueError(
            f"{MISSING_DIMENSION_COUNT}: {dimension_id} "
            f"({':'.join(envelope.sort_key)})"
        )
    return row


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
    "MISSING_DIMENSION_COUNT",
    "NO_ACTIVE_TAXONOMY",
    "NO_BASELINE",
    "NO_POLICY",
    "NO_TEMPLATES",
    "TAXONOMY_MISMATCH",
    "MeasurePoint",
    "MetricAggregation",
    "MetricOutcome",
    "PolicySampler",
    "ProgressReport",
    "SamplePolicy",
    "SampleVerdict",
    "fact_identifier",
]
