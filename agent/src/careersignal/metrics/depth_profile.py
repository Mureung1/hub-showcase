"""역량별 깊이 프로파일.

정의는 docs/statistics-model.md 9장이고, 입력 지표는 docs/metric-spec.md 3.3 의
`depth_distribution`, 저장 자리는 docs/erd.md 10.6 의 `capability_depth_profiles` 다.
역량과 차원의 연결은 docs/erd.md 7.11 의 `capability_dimension_links` 가 갖는다.

깊이 등급의 의미는 Wiki 가 정의하고(docs/knowledge-schema.md 8.2), 어느 등급이
기대되는지는 이 산출물이 정한다(같은 문서 8.6). 기대 깊이는 직무·대상군·기업군·기간·
표본에 따라 달라지므로 개념 문서의 고정 속성으로 두지 않는다.

집계는 결정적으로 수행한다. 생성 모델은 수치를 산출하지 않으므로 이 실행에 모델 호출이
없다(docs/statistics-model.md 5.1). 실행은 저장된 `depth_distribution` 행을 읽고, 역량에
붙은 차원의 분포를 하나로 합치고, 기대 깊이를 골라 저장하는 세 단계다. 가운데 단계는
순수 함수이며 저장소 없이 검사된다.

표본 판정은 `metrics/policy.py` 가 한다. 최소 표본과 억제 정책은 코드 상수가 아니라
`metric_policy_versions` 의 행이며(docs/metric-spec.md 6장), 이 모듈은 정책 행과 카운트를
넘긴 뒤 돌려받은 판정을 따른다. 판정은 대상군마다 따로 하므로(docs/statistics-model.md
5.3) 한 대상군의 미달이 다른 대상군의 프로파일을 막지 않는다.

역량이 하나도 없는 상태를 정상으로 취급한다. `capabilities` 는 D3b 가 채우는 표이고
집계는 읽기만 하므로, 역량이 없으면 만들 프로파일이 없다는 결과로 끝난다. 이때 어떤
지표 조회도 실행하지 않는다.
"""

from __future__ import annotations

import hashlib
from collections.abc import Mapping, Sequence
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator

from careersignal.contracts.run_context import RunContext, StopReason
from careersignal.domain.depth import DepthLevel, rank
from careersignal.metrics import policy as metric_policy
from careersignal.metrics.expansion import Envelope, MetricFamily
from careersignal.repositories.profiles import DepthProfileRepository

DEPTH_ORDER: tuple[DepthLevel, ...] = tuple(sorted(DepthLevel, key=rank))
"""얕은 등급부터의 순서. 순서 자체는 `domain/depth.py` 가 갖는다.

`foundation < application < tradeoff` 이며 구조는 직무와 무관하게 고정한다
(docs/knowledge-schema.md 8.2). 여기서 다시 정의하지 않고 도메인의 순위를 정렬해 쓴다.
"""

DEPTH_MEASURES: tuple[str, ...] = tuple(str(level) for level in DEPTH_ORDER)
"""`depth_distribution` 의 measure 이름. 등급 이름을 그대로 쓴다(docs/metric-spec.md 3.3)."""

EXPECTED_DEPTH_TAIL_SHARE = 0.5
"""기대 깊이를 고르는 누적 비율 기준.

가장 깊은 등급부터 아래로 누적한 비율이 이 값에 처음 도달하는 등급을 기대 깊이로 삼는다.
곧 순서 있는 세 등급의 중앙값이며, 절반 이상의 공고가 그 등급 이상을 요구한다는 뜻이다.

가장 깊은 등급을 그대로 쓰지 않는 이유는 공고 한 건의 `tradeoff` 표기가 기대 깊이를
올려 버리기 때문이고, 최빈 등급을 쓰지 않는 이유는 등급이 순서를 갖는 값이라 빈도만
보면 `foundation` 40%·`application` 30%·`tradeoff` 30% 에서 준비 기준이 실제보다 낮게
잡히기 때문이다. 가장 깊은 요구에 맞추면 아래 등급은 따라온다는 3.3 의 준비 기준을
누적 비율로 옮긴 값이다.

문서가 임계값을 정하지 않으므로 중앙값을 쓴다. `metric_policy_versions` 에도 이 값을 둘
컬럼이 없다(docs/erd.md 10.3).
"""

SHARE_DIGITS = 6
"""`evidence_support` 의 비율을 반올림하는 소수 자리.

`depth_distribution` jsonb 의 세 비율은 반올림하지 않는다. 세 값의 합이 1 이어야
하는데(docs/metric-spec.md 3.3) 자리를 자르면 합이 1 을 벗어난다. jsonb 에는
`statistics_facts.value` 같은 자릿수 제약이 없으므로 나눈 값을 그대로 담는다.
"""

CONFIDENCE_DIGITS = 5
"""`confidence` 를 반올림하는 소수 자리. `numeric(6,5)` 와 맞춘다(docs/erd.md 10.6)."""

MERGE_RULE = "sample_weighted_pool"
"""여러 차원의 깊이 분포를 하나로 합치는 규칙의 이름. `evidence_support` 에 남긴다."""

EXPECTED_DEPTH_RULE = "deepest_tail_share"
"""기대 깊이를 고르는 규칙의 이름. `evidence_support` 에 남긴다."""

NO_ACTIVE_TAXONOMY = "활성 분류체계 버전이 없다"
"""분류체계가 발행되지 않았다. 역량에 걸 차원 연결이 없다."""

TAXONOMY_MISMATCH = "실행 봉투의 분류체계 버전이 활성 버전과 다르다"
"""봉투가 고정한 버전과 저장소의 활성 버전이 어긋났다. 섞어 합치지 않는다."""

NO_POLICY = "depth_distribution 의 지표 정책 버전이 없다"
"""`metric_policy_versions` 에 발효된 행이 없다. 임계값을 지어내지 않는다."""

NO_LINKED_DIMENSION = "역량에 연결된 차원이 없다"
"""`capability_dimension_links` 에 이 분류체계 버전의 행이 없다."""

NO_DEPTH_FACT = "봉투에 depth_distribution 결과가 없다"
"""연결된 차원 가운데 이 봉투에서 계산된 것이 없다. 집계를 먼저 돌린 뒤 만든다."""

INCOMPLETE_DEPTH_FACT = "등급 세 measure 가 모두 있지 않다"
"""한 차원의 measure 가 빠졌다. 세 분자의 합이 분모와 같아야 한다(docs/metric-spec.md 3.3)."""


class DimensionDepth(BaseModel):
    """차원 하나의 깊이 분포. 저장된 `depth_distribution` 세 행을 모은 값이다.

    세 분자의 합이 분모와 같다. 대표 등급 규칙이 공고 버전마다 한 등급만 남기므로
    (docs/metric-spec.md 3.3) 어긋날 수 없고, 어긋났다면 지표 행이 덜 저장된 것이다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    dimension_id: str
    counts: dict[str, int]
    """등급별 분자. 키는 `DEPTH_MEASURES` 세 값이다."""

    denominator: int = Field(ge=0)
    """이 차원 할당이 있는 `posting_version` 수."""

    @model_validator(mode="after")
    def _check_counts(self) -> DimensionDepth:
        if set(self.counts) != set(DEPTH_MEASURES):
            raise ValueError(INCOMPLETE_DEPTH_FACT)
        if any(count < 0 for count in self.counts.values()):
            raise ValueError("분자는 음수일 수 없다")
        if sum(self.counts.values()) != self.denominator:
            raise ValueError(
                "등급별 분자의 합이 분모와 다르다: "
                f"{self.dimension_id} {self.counts} vs {self.denominator}"
            )
        return self


class CapabilityDepth(BaseModel):
    """차원 여럿을 합친 역량 하나의 깊이 분포."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    dimension_ids: tuple[str, ...]
    pooled: dict[str, int]
    """등급별 분자의 합. 차원마다 분모가 다르므로 표본 가중이 여기서 걸린다."""

    pooled_denominator: int = Field(ge=1)
    distribution: dict[str, float]
    """등급별 비율. `capability_depth_profiles.depth_distribution` 에 그대로 넣는다."""

    sample_size: int = Field(ge=0)
    """이 프로파일이 근거로 삼는 공고 버전 수의 하한.

    차원별 분모의 최댓값이다. 합이 아니다. 한 공고가 같은 역량의 두 차원을 함께
    말하면 분모의 합은 그 공고를 두 번 세지만, 모든 지표의 중복 제거 단위는
    `posting_version_id` 다(docs/metric-spec.md 2.2). 서로 다른 차원의 공고 집합이
    저장된 카운트만으로는 풀리지 않으므로, 합집합의 하한인 최댓값을 표본 수로 쓴다.
    표본을 부풀리지 않는 쪽으로 판정이 기운다.
    """


def merge_dimensions(depths: Sequence[DimensionDepth]) -> CapabilityDepth | None:
    """한 역량에 붙은 차원들의 깊이 분포를 하나로 합친다.

    한 역량에 차원이 여럿 붙을 수 있으나(docs/erd.md 7.11) 프로파일은 역량마다 하나다
    (같은 문서 10.6). 문서가 합치는 규정을 두지 않으므로 표본 가중 합산을 쓴다.

    ```text
    p(등급) = Σ_차원 분자(차원, 등급) / Σ_차원 분모(차원)
    ```

    등급별 분자와 분모를 각각 더한 뒤 나눈다. 곧 차원별 비율을 그 차원의 분모로 가중해
    평균한 값이며, 세 비율의 합이 1 이다. 비율을 그냥 평균하지 않는 이유는 공고 두 건에서
    관측된 차원과 이백 건에서 관측된 차원이 같은 무게를 갖게 되기 때문이다. 기대 깊이가
    표본에 따라 달라진다는 것이 이 산출물의 전제다(docs/statistics-model.md 9장).

    분모가 모두 0 이거나 목록이 비면 합칠 것이 없으므로 None 이다.
    """
    usable = sorted(
        (depth for depth in depths if depth.denominator > 0),
        key=lambda depth: depth.dimension_id,
    )
    if not usable:
        return None

    pooled = {
        measure: sum(depth.counts[measure] for depth in usable)
        for measure in DEPTH_MEASURES
    }
    pooled_denominator = sum(depth.denominator for depth in usable)
    return CapabilityDepth(
        dimension_ids=tuple(depth.dimension_id for depth in usable),
        pooled=pooled,
        pooled_denominator=pooled_denominator,
        distribution={
            measure: count / pooled_denominator for measure, count in pooled.items()
        },
        sample_size=max(depth.denominator for depth in usable),
    )


def tail_share(pooled: Mapping[str, int], denominator: int, level: DepthLevel) -> float:
    """그 등급 이상을 요구한 비율. 등급이 순서를 갖는 값이므로 꼬리로 읽는다."""
    if denominator <= 0:
        raise ValueError("분모가 0 이면 비율이 성립하지 않는다")
    deeper = sum(
        pooled[str(candidate)]
        for candidate in DEPTH_ORDER
        if rank(candidate) >= rank(level)
    )
    return deeper / denominator


def expected_depth(depth: CapabilityDepth) -> DepthLevel:
    """기대 깊이 한 등급. `expected_depth` 가 NOT NULL 이므로 반드시 하나를 고른다.

    가장 깊은 등급부터 아래로 누적 비율을 세어 `EXPECTED_DEPTH_TAIL_SHARE` 에 처음
    도달하는 등급을 고른다. `foundation` 의 누적 비율은 언제나 1 이므로 고르지 못하는
    경우가 없고, 같은 분포에서 같은 등급이 나오므로 재실행이 값을 바꾸지 않는다.
    """
    for level in reversed(DEPTH_ORDER):
        if (
            tail_share(depth.pooled, depth.pooled_denominator, level)
            >= EXPECTED_DEPTH_TAIL_SHARE
        ):
            return level
    return DEPTH_ORDER[0]


def confidence_of(depth: CapabilityDepth, level: DepthLevel) -> float:
    """고른 등급의 누적 비율. `capability_depth_profiles.confidence` 에 넣는다.

    기준을 얼마나 넘겨 골랐는지를 담는다. 0.5 에 겨우 닿아 고른 등급과 0.9 로 고른
    등급을 같은 값으로 두면 이후 단계가 두 프로파일을 구분하지 못한다.
    """
    return round(
        tail_share(depth.pooled, depth.pooled_denominator, level), CONFIDENCE_DIGITS
    )


def profile_key(
    capability_id: str, envelope: Envelope
) -> tuple[str, str, str, str, str]:
    """`capability_depth_profiles` 의 유일 조건에서 분석 버전을 뺀 나머지.

    조건은 docs/erd.md 10.6 이며 `0009_entry_segment_axis.sql` 이 대상군을 더했다.
    기대 깊이는 대상군에 따라 다르므로 두 대상군의 값을 한 행에 담지 않는다.
    """
    return (
        capability_id,
        str(envelope.scope_level),
        envelope.scope_id,
        str(envelope.entry_segment),
        envelope.period_id,
    )


def profile_identifier(analysis_version: str, key: Sequence[str]) -> str:
    """같은 분석 버전의 같은 키는 같은 프로파일 행이다.

    재료가 유일 조건과 같으므로 재실행이 같은 행을 가리키고, 분석 버전이 다르면 다른
    식별자가 되어 이전 버전의 프로파일이 그대로 남는다.
    """
    material = ":".join([analysis_version, *key]).encode()
    return f"prof_{hashlib.sha256(material).hexdigest()[:24]}"


def evidence_support(
    depth: CapabilityDepth,
    level: DepthLevel,
    outcome: metric_policy.SampleVerdict,
    metric_policy_version: str,
) -> dict[str, Any]:
    """프로파일이 무엇에서 나왔는지. `evidence_support` jsonb 에 넣는다.

    합치는 규칙과 고르는 규칙, 근거가 된 차원과 카운트, 표본 판정을 함께 담는다. 어느
    차원이 어느 무게로 들어갔는지가 남아야 프로파일 하나를 지표 행까지 되짚을 수 있다.
    """
    return {
        "metric_family": str(MetricFamily.DEPTH_DISTRIBUTION),
        "metric_policy_version": metric_policy_version,
        "merge_rule": MERGE_RULE,
        "expected_depth_rule": EXPECTED_DEPTH_RULE,
        "expected_depth_threshold": EXPECTED_DEPTH_TAIL_SHARE,
        "dimension_ids": list(depth.dimension_ids),
        "pooled": dict(depth.pooled),
        "pooled_denominator": depth.pooled_denominator,
        "tail_share": round(
            tail_share(depth.pooled, depth.pooled_denominator, level),
            SHARE_DIGITS,
        ),
        "sample_status": str(outcome.sample_status),
        "uncertainty": outcome.uncertainty,
    }


class DepthProfileOutcome(BaseModel):
    """프로파일 생성 실행 하나의 결과."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    agent_run_id: str
    stop_reason: StopReason
    taxonomy_version_id: str | None = None

    capability_count: int = 0
    """`capabilities` 의 활성 행 수. 0 이면 만들 프로파일이 없다."""

    envelope_count: int = 0
    """저장된 `depth_distribution` 행이 있는 봉투 수."""

    expanded_profiles: int = 0
    skipped_profiles: int = 0
    """이 분석 버전에 이미 있어 다시 만들지 않은 프로파일. 증분 재실행이 여기서 갈린다."""

    stored_profiles: int = 0
    limit_reached: bool = False
    """한도에 닿아 남은 프로파일을 만들지 않았는가.

    참이면 이 실행이 전량을 끝내지 않았다. 증분 판정이 이미 만든 프로파일을 건너뛰므로
    같은 명령을 다시 돌리면 남은 것부터 집는다.
    """

    suppressed_profiles: int = 0
    """표본이 모자라 저장하지 않은 프로파일.

    `capability_depth_profiles` 에는 `sample_status` 컬럼이 없고 `expected_depth` 가
    NOT NULL 이므로, 값을 비운 행으로 남길 자리가 없다. 억제 정책이 값을 숨기라고 하면
    행을 만들지 않고 이 수에만 남긴다(docs/metric-spec.md 2.4).
    """

    missing_input: tuple[tuple[str, str], ...] = ()
    """입력이 없어 만들지 못한 프로파일. `(대상, 사유)` 다."""

    errors: tuple[tuple[str, str], ...] = ()
    halted_reason: str | None = None

    @property
    def gained_evidence(self) -> bool:
        return self.stored_profiles > 0

    @property
    def halted(self) -> bool:
        return self.halted_reason is not None


class CapabilityDepthProfiles:
    """저장된 `depth_distribution` 에서 역량별 기대 깊이를 만들어 저장한다."""

    def __init__(self, repository: DepthProfileRepository) -> None:
        self._repository = repository

    # ------------------------------------------------------------ 진입점
    def run(
        self,
        context: RunContext,
        period_ids: Sequence[str] | None = None,
        limit: int | None = None,
    ) -> DepthProfileOutcome:
        """증분 실행. 이 분석 버전에 아직 없는 프로파일만 만든다.

        `period_ids` 를 주면 그 기간의 지표 행만 읽고, 주지 않으면 저장된 전 기간을 읽는다.

        `limit` 은 이번 실행이 만들 프로파일 수의 상한이다. 이미 있는 프로파일을 먼저 뺀
        뒤 남은 것을 앞에서부터 집는다. 봉투와 역량의 차례가 결정적이므로 어디까지
        집었는지를 따로 적어 두지 않아도 이어 돌리는 실행이 앞으로 나아간다.
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
        capabilities = [
            str(row["capability_id"])
            for row in self._repository.capabilities(context.job_role_id)
        ]
        state.capability_count = len(capabilities)
        if not capabilities:
            return state.outcome()

        links = self._links(taxonomy_version_id, capabilities, state)
        if not links:
            return state.outcome()

        policy_row = self._repository.depth_policy(context.as_of_date)
        if policy_row is None:
            state.errors.append((str(MetricFamily.DEPTH_DISTRIBUTION), NO_POLICY))
            return state.outcome()
        policy = metric_policy.policy_from_row(policy_row)

        facts = self._facts(context.analysis_version, period_ids)
        state.envelope_count = len(facts)
        state.existing = self._repository.existing_profile_keys(
            context.analysis_version
        )

        for envelope in sorted(facts, key=lambda item: item.sort_key):
            for capability_id in capabilities:
                self._build(
                    capability_id,
                    links.get(capability_id, ()),
                    envelope,
                    facts[envelope],
                    policy,
                    state,
                )
        return state.outcome()

    # ------------------------------------------------------------ 프로파일 하나
    def _build(
        self,
        capability_id: str,
        dimension_ids: Sequence[str],
        envelope: Envelope,
        depths: Mapping[str, DimensionDepth],
        policy: metric_policy.MetricPolicyVersion,
        state: _State,
    ) -> None:
        """역량 하나 × 봉투 하나."""
        if not dimension_ids:
            return
        available = [depths[d] for d in sorted(dimension_ids) if d in depths]
        if not available:
            state.missing_input.append(
                (_label(capability_id, envelope), NO_DEPTH_FACT)
            )
            return

        state.expanded += 1
        key = profile_key(capability_id, envelope)
        if key in state.existing:
            state.skipped += 1
            return

        if state.reached_limit():
            return

        merged = merge_dimensions(available)
        if merged is None:
            state.missing_input.append(
                (_label(capability_id, envelope), NO_DEPTH_FACT)
            )
            return

        level = expected_depth(merged)
        outcome = metric_policy.evaluate(
            policy,
            measure=str(level),
            numerator=merged.pooled[str(level)],
            denominator=merged.pooled_denominator,
            sample_size=merged.sample_size,
        )
        if outcome.suppressed:
            state.suppressed += 1
            return

        row = {
            "profile_id": profile_identifier(state.context.analysis_version, key),
            "capability_id": capability_id,
            "taxonomy_version_id": state.taxonomy_version_id,
            "scope_level": str(envelope.scope_level),
            "scope_id": envelope.scope_id,
            "entry_segment": str(envelope.entry_segment),
            "period_id": envelope.period_id,
            "depth_distribution": dict(merged.distribution),
            "expected_depth": str(level),
            "sample_size": merged.sample_size,
            "evidence_support": evidence_support(
                merged, level, outcome, policy.metric_policy_version
            ),
            "confidence": confidence_of(merged, level),
            "analysis_version": state.context.analysis_version,
        }
        try:
            self._repository.add_profile(row)
        except Exception as exc:
            state.errors.append((_label(capability_id, envelope), _failure(exc)))
            return
        state.existing.add(key)
        state.stored += 1

    # ------------------------------------------------------------ 입력
    def _links(
        self, taxonomy_version_id: str, capabilities: Sequence[str], state: _State
    ) -> dict[str, tuple[str, ...]]:
        """역량마다 연결된 차원. 연결이 없는 역량은 사유를 남긴다."""
        grouped: dict[str, list[str]] = {}
        for row in self._repository.capability_dimension_links(taxonomy_version_id):
            grouped.setdefault(str(row["capability_id"]), []).append(
                str(row["dimension_id"])
            )
        for capability_id in capabilities:
            if capability_id not in grouped:
                state.missing_input.append((capability_id, NO_LINKED_DIMENSION))
        return {
            capability_id: tuple(sorted(set(dimension_ids)))
            for capability_id, dimension_ids in grouped.items()
        }

    def _facts(
        self, analysis_version: str, period_ids: Sequence[str] | None
    ) -> dict[Envelope, dict[str, DimensionDepth]]:
        """저장된 `depth_distribution` 행을 봉투 × 차원으로 접는다.

        세 measure 가 모두 있는 차원만 남긴다. 등급 하나가 빠진 채로 합치면 세 비율의
        합이 1 이 되지 않는다(docs/metric-spec.md 3.3).
        """
        collected: dict[Envelope, dict[str, dict[str, Any]]] = {}
        for row in self._repository.depth_facts(analysis_version, period_ids):
            envelope = Envelope(
                scope_level=str(row["scope_level"]),
                scope_id=str(row["scope_id"]),
                entry_segment=str(row["entry_segment"]),
                period_id=str(row["period_id"]),
            )
            dimension_id = str(row["dimension_id"])
            slot = collected.setdefault(envelope, {}).setdefault(
                dimension_id, {"counts": {}, "denominator": None}
            )
            slot["counts"][str(row["measure"])] = int(row["numerator"])
            slot["denominator"] = int(row["denominator"])

        facts: dict[Envelope, dict[str, DimensionDepth]] = {}
        for envelope, dimensions in collected.items():
            # 봉투는 지표 행이 있으면 남긴다. 등급이 덜 저장된 차원만 빠지므로 그 봉투의
            # 역량이 근거 없음으로 기록되고, 봉투 자체가 사라져 조용히 넘어가지 않는다.
            facts[envelope] = {}
            for dimension_id, slot in dimensions.items():
                if set(slot["counts"]) != set(DEPTH_MEASURES):
                    continue
                facts[envelope][dimension_id] = DimensionDepth(
                    dimension_id=dimension_id,
                    counts=dict(slot["counts"]),
                    denominator=int(slot["denominator"]),
                )
        return facts

    # ------------------------------------------------------------ 실패
    def _halted(
        self,
        context: RunContext,
        reason: str,
        taxonomy_version_id: str | None = None,
    ) -> DepthProfileOutcome:
        """실행 전제가 깨진 결과. 만들 것 없음과 구분한다."""
        return DepthProfileOutcome(
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

        self.capability_count = 0
        self.envelope_count = 0
        self.expanded = 0
        self.skipped = 0
        self.stored = 0
        self.suppressed = 0

        self.existing: set[tuple[str, ...]] = set()
        self.missing_input: list[tuple[str, str]] = []
        self.errors: list[tuple[str, str]] = []

    def reached_limit(self) -> bool:
        """이번 실행의 한도를 다 썼는가. 닿은 사실을 결과에 남긴다.

        건너뛴 프로파일은 세지 않는다. 한도는 만들 프로파일의 수이며, 이미 있는 것을
        세면 이어 돌리는 실행이 앞으로 나아가지 못한다.
        """
        if self.limit is None or self.stored + self.suppressed < self.limit:
            return False
        self.limit_reached = True
        return True

    def outcome(self) -> DepthProfileOutcome:
        return DepthProfileOutcome(
            agent_run_id=self.context.agent_run_id,
            stop_reason=_stop_reason(
                expanded=self.expanded, stored=self.stored, errors=bool(self.errors)
            ),
            taxonomy_version_id=self.taxonomy_version_id,
            capability_count=self.capability_count,
            envelope_count=self.envelope_count,
            expanded_profiles=self.expanded,
            skipped_profiles=self.skipped,
            stored_profiles=self.stored,
            limit_reached=self.limit_reached,
            suppressed_profiles=self.suppressed,
            missing_input=tuple(self.missing_input),
            errors=tuple(self.errors),
        )


def _label(capability_id: str, envelope: Envelope) -> str:
    """실패 목록에 적을 프로파일 이름."""
    return ":".join(profile_key(capability_id, envelope))


def _failure(exc: BaseException) -> str:
    """예외 하나를 결과에 적을 한 줄로 옮긴다."""
    return f"{type(exc).__name__}: {exc}"


def _stop_reason(expanded: int, stored: int, errors: bool) -> StopReason:
    """docs/agent-design.md 11.1의 종료 조건을 판정한다.

    역량이 없거나 지표 행이 없어 만들 것이 없는 실행은 실패가 아니라 더 볼 것이 없는
    상태다. 예산 소진은 쓰지 않는다. 이 실행에 외부 호출이 없어 봉투의 한도에 걸릴
    자리가 없다.
    """
    if errors:
        return StopReason.EXPLICIT_FAILURE
    if not expanded:
        return StopReason.FRONTIER_EXHAUSTED
    if stored:
        return StopReason.SLOTS_FILLED
    return StopReason.NO_NEW_EVIDENCE


__all__ = [
    "CONFIDENCE_DIGITS",
    "DEPTH_MEASURES",
    "DEPTH_ORDER",
    "SHARE_DIGITS",
    "EXPECTED_DEPTH_RULE",
    "EXPECTED_DEPTH_TAIL_SHARE",
    "MERGE_RULE",
    "NO_ACTIVE_TAXONOMY",
    "NO_DEPTH_FACT",
    "NO_LINKED_DIMENSION",
    "NO_POLICY",
    "TAXONOMY_MISMATCH",
    "CapabilityDepth",
    "CapabilityDepthProfiles",
    "DepthProfileOutcome",
    "DimensionDepth",
    "confidence_of",
    "evidence_support",
    "expected_depth",
    "merge_dimensions",
    "profile_identifier",
    "profile_key",
    "tail_share",
]
