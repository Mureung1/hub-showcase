from __future__ import annotations

import math
from typing import Literal

from pydantic import BaseModel, Field, model_validator

FORMULA_VERSION = "1.1.0"

SourceType = Literal["official", "official_estimate", "observed", "derived", "fixture"]
SampleBasis = Literal["known", "unknown", "administrative_population"]
FreshnessPolicy = Literal["fast", "cohort", "structural"]
DecisionStatus = Literal["supported", "insufficient_evidence"]
ReasonTone = Literal["positive", "caution", "info"]
ClusterType = Literal[
    "ordinary",
    "productive_cluster",
    "specialized_watch",
    "saturated_cluster",
]


class ScoreMetric(BaseModel):
    value: float
    percentile: float = Field(ge=0, le=1)
    unit: str
    source_name: str
    source_url: str | None = None
    source_type: SourceType
    period: str
    sample_size: int | None = Field(default=None, ge=0)
    sample_basis: SampleBasis = "unknown"
    age_days: int = Field(default=0, ge=0)
    reliability: float = Field(default=1, ge=0, le=1)

    @model_validator(mode="after")
    def validate_sample_basis(self) -> ScoreMetric:
        if "sample_basis" not in self.model_fields_set and self.sample_size is not None:
            self.sample_basis = "known"
        if self.sample_basis == "known" and self.sample_size is None:
            raise ValueError("sample_size is required when sample_basis is known")
        if self.sample_basis == "unknown" and self.sample_size is not None:
            raise ValueError("sample_size must be omitted when sample_basis is unknown")
        return self


class MarketScoreRequest(BaseModel):
    market_id: str
    market_name: str
    category: str
    peer_group: str
    local_category_store_count: int = Field(ge=0)
    local_total_store_count: int = Field(gt=0)
    peer_category_share: float = Field(gt=0, le=1)
    peer_sample_size: int | None = Field(default=None, ge=0)
    metrics: dict[str, ScoreMetric]

    @model_validator(mode="after")
    def validate_store_counts(self) -> MarketScoreRequest:
        if self.local_category_store_count > self.local_total_store_count:
            raise ValueError("local_category_store_count cannot exceed local_total_store_count")
        return self


class ComponentResult(BaseModel):
    key: str
    label: str
    score: float
    weight_percent: float
    observed_score: float | None
    coverage: float
    configured_weight_percent: float
    evidence_keys: list[str]


class ClusterResult(BaseModel):
    classification: ClusterType
    local_quotient: float
    adjustment: float
    raw_adjustment: float
    evidence_confidence: float
    evidence_keys: list[str]
    explanation: str


class MetricEvidenceResult(BaseModel):
    metric_key: str
    reliability: float
    freshness_policy: FreshnessPolicy
    freshness_grace_days: int
    freshness_expire_days: int
    freshness: float
    sample_basis: SampleBasis
    sample_strength: float
    evidence_strength: float


class ScoreReason(BaseModel):
    tone: ReasonTone
    metric_key: str
    label: str
    message: str
    value: float
    unit: str
    percentile: float
    source_name: str
    period: str


class MarketScoreResponse(BaseModel):
    formula_version: str
    market_id: str
    market_name: str
    category: str
    peer_group: str
    score: float
    band: str
    decision_status: DecisionStatus
    confidence: float
    confidence_label: str
    data_coverage: float
    components: list[ComponentResult]
    cluster: ClusterResult
    metric_evidence: list[MetricEvidenceResult]
    decision_blockers: list[str]
    reasons: list[ScoreReason]
    limitations: list[str]


METRIC_DEFINITIONS: dict[str, tuple[str, Literal["higher", "lower"]]] = {
    "sales_per_store": ("점포당 추정매출", "higher"),
    "foot_traffic": ("유동 수요", "higher"),
    "demand_growth": ("수요 증가율", "higher"),
    "survival_rate": ("동일 cohort 생존율", "higher"),
    "closure_rate": ("폐업률", "lower"),
    "same_category_density": ("동일 업종 밀도", "lower"),
    "market_diversity": ("업종 다양성", "higher"),
    "sales_growth": ("매출 증가율", "higher"),
    "net_opening_rate": ("점포 순증률", "higher"),
    "transit_access": ("대중교통 접근성", "higher"),
    "walkability": ("보행 접근성", "higher"),
}

COMPONENT_DEFINITIONS: dict[str, tuple[str, float, dict[str, float]]] = {
    "demand": (
        "수요",
        0.30,
        {"sales_per_store": 0.45, "foot_traffic": 0.35, "demand_growth": 0.20},
    ),
    "stability": (
        "영업 안정성",
        0.25,
        {"survival_rate": 0.55, "closure_rate": 0.45},
    ),
    "competition_fit": (
        "경쟁 적합성",
        0.20,
        {"same_category_density": 0.65, "market_diversity": 0.35},
    ),
    "growth": (
        "성장성",
        0.15,
        {"sales_growth": 0.55, "net_opening_rate": 0.45},
    ),
    "access": (
        "접근성",
        0.10,
        {"transit_access": 0.55, "walkability": 0.45},
    ),
}

SOURCE_RELIABILITY_CAP: dict[SourceType, float] = {
    "official": 1.0,
    "official_estimate": 0.90,
    "derived": 0.85,
    "observed": 0.70,
    "fixture": 0.25,
}

FRESHNESS_POLICIES: dict[FreshnessPolicy, tuple[int, int]] = {
    "fast": (180, 730),
    "cohort": (365, 1095),
    "structural": (365, 1825),
}

METRIC_FRESHNESS_POLICY: dict[str, FreshnessPolicy] = {
    "sales_per_store": "fast",
    "foot_traffic": "fast",
    "demand_growth": "fast",
    "survival_rate": "cohort",
    "closure_rate": "fast",
    "same_category_density": "structural",
    "market_diversity": "structural",
    "sales_growth": "fast",
    "net_opening_rate": "fast",
    "transit_access": "structural",
    "walkability": "structural",
}

REQUIRED_METRIC_KEYS = frozenset({"sales_per_store", "foot_traffic"})
MINIMUM_PEER_SAMPLE_SIZE = 30


def _quality_percentile(key: str, metric: ScoreMetric) -> float:
    direction = METRIC_DEFINITIONS[key][1]
    return metric.percentile if direction == "higher" else 1 - metric.percentile


def _weighted_mean(values: list[tuple[float, float]]) -> float:
    total_weight = sum(weight for _, weight in values)
    if total_weight == 0:
        return 0
    return sum(value * weight for value, weight in values) / total_weight


def _freshness_strength(key: str, age_days: int) -> tuple[FreshnessPolicy, int, int, float]:
    policy = METRIC_FRESHNESS_POLICY[key]
    grace_days, expire_days = FRESHNESS_POLICIES[policy]
    if age_days <= grace_days:
        freshness = 1.0
    elif age_days >= expire_days:
        freshness = 0.0
    else:
        freshness = 1 - (age_days - grace_days) / (expire_days - grace_days)
    return policy, grace_days, expire_days, freshness


def _sample_strength(metric: ScoreMetric) -> float:
    if metric.sample_basis == "administrative_population":
        return 1.0
    if metric.sample_basis == "unknown":
        return 0.40
    assert metric.sample_size is not None
    return min(1.0, math.sqrt(metric.sample_size / 30))


def _metric_evidence_result(key: str, metric: ScoreMetric) -> MetricEvidenceResult:
    reliability = min(metric.reliability, SOURCE_RELIABILITY_CAP[metric.source_type])
    policy, grace_days, expire_days, freshness = _freshness_strength(key, metric.age_days)
    sample_strength = _sample_strength(metric)
    evidence_strength = 0.45 * reliability + 0.35 * freshness + 0.20 * sample_strength
    return MetricEvidenceResult(
        metric_key=key,
        reliability=round(reliability, 4),
        freshness_policy=policy,
        freshness_grace_days=grace_days,
        freshness_expire_days=expire_days,
        freshness=round(freshness, 4),
        sample_basis=metric.sample_basis,
        sample_strength=round(sample_strength, 4),
        evidence_strength=round(evidence_strength, 4),
    )


def _ordinary_cluster(local_quotient: float) -> ClusterResult:
    return ClusterResult(
        classification="ordinary",
        local_quotient=round(local_quotient, 2),
        adjustment=0,
        raw_adjustment=0,
        evidence_confidence=0,
        evidence_keys=[],
        explanation="동일 업종 집적이 peer group보다 뚜렷하게 높지 않습니다.",
    )


def _cluster_result(
    request: MarketScoreRequest,
    metrics: dict[str, ScoreMetric],
    evidence_by_key: dict[str, MetricEvidenceResult],
) -> tuple[ClusterResult, bool]:
    local_share = request.local_category_store_count / request.local_total_store_count
    local_quotient = local_share / request.peer_category_share

    if (
        request.local_total_store_count < 20
        or request.local_category_store_count < 5
        or local_quotient < 1.25
    ):
        return _ordinary_cluster(local_quotient), False

    positive_keys = ["sales_per_store", "foot_traffic", "survival_rate", "sales_growth"]
    positive_values = [metrics[key].percentile for key in positive_keys if key in metrics]
    positive_evidence = sum(positive_values) / len(positive_values) if positive_values else 0.5

    negative_values: list[float] = []
    if "sales_per_store" in metrics:
        negative_values.append(1 - metrics["sales_per_store"].percentile)
    if "closure_rate" in metrics:
        negative_values.append(metrics["closure_rate"].percentile)
    if "sales_growth" in metrics:
        negative_values.append(1 - metrics["sales_growth"].percentile)
    negative_evidence = sum(negative_values) / len(negative_values) if negative_values else 0.5

    strength = min(1.0, max(0.0, (local_quotient - 1.25) / 1.75))
    sales_percentile = metrics.get("sales_per_store")
    traffic_percentile = metrics.get("foot_traffic")
    closure_percentile = metrics.get("closure_rate")

    productive = (
        positive_evidence >= 0.58
        and sales_percentile is not None
        and sales_percentile.percentile >= 0.50
        and traffic_percentile is not None
        and traffic_percentile.percentile >= 0.55
        and (closure_percentile is None or closure_percentile.percentile <= 0.60)
    )
    saturated = negative_evidence >= 0.58 and (
        (sales_percentile is not None and sales_percentile.percentile < 0.45)
        or (closure_percentile is not None and closure_percentile.percentile > 0.65)
    )

    evidence_keys = sorted(
        {
            key
            for key in (*positive_keys, "closure_rate")
            if key in metrics and key in evidence_by_key
        }
    )
    evidence_confidence = _weighted_mean(
        [(evidence_by_key[key].evidence_strength, 1.0) for key in evidence_keys]
    )

    if evidence_confidence < 0.60:
        return (
            ClusterResult(
                classification="specialized_watch",
                local_quotient=round(local_quotient, 2),
                adjustment=0,
                raw_adjustment=0,
                evidence_confidence=round(evidence_confidence, 4),
                evidence_keys=evidence_keys,
                explanation=(
                    "동일 업종이 집중됐지만 집적효과 판단 근거의 신뢰도가 낮아 "
                    "가점·감점을 보류합니다."
                ),
            ),
            True,
        )

    if productive:
        raw_adjustment = min(8.0, 8 * strength * (0.5 + positive_evidence / 2))
        adjustment = raw_adjustment * evidence_confidence
        return (
            ClusterResult(
                classification="productive_cluster",
                local_quotient=round(local_quotient, 2),
                adjustment=round(adjustment, 1),
                raw_adjustment=round(raw_adjustment, 1),
                evidence_confidence=round(evidence_confidence, 4),
                evidence_keys=evidence_keys,
                explanation=(
                    "동일 업종이 모여 있지만 점포당 매출·유동 수요·생존 근거가 함께 받쳐주는 "
                    "생산적 집적상권입니다."
                ),
            ),
            False,
        )

    if saturated:
        raw_adjustment = -min(8.0, 8 * strength * (0.5 + negative_evidence / 2))
        adjustment = raw_adjustment * evidence_confidence
        return (
            ClusterResult(
                classification="saturated_cluster",
                local_quotient=round(local_quotient, 2),
                adjustment=round(adjustment, 1),
                raw_adjustment=round(raw_adjustment, 1),
                evidence_confidence=round(evidence_confidence, 4),
                evidence_keys=evidence_keys,
                explanation=(
                    "동일 업종 집적과 함께 점포당 매출 희석 또는 높은 폐업 신호가 나타나는 "
                    "과포화 후보입니다."
                ),
            ),
            False,
        )

    return (
        ClusterResult(
            classification="specialized_watch",
            local_quotient=round(local_quotient, 2),
            adjustment=0,
            raw_adjustment=0,
            evidence_confidence=round(evidence_confidence, 4),
            evidence_keys=evidence_keys,
            explanation=(
                "동일 업종이 집중된 특화상권이지만 집적효과와 과포화를 구분할 근거가 충분하지 않아 "
                "가점·감점을 보류합니다."
            ),
        ),
        False,
    )


def _score_band(score: float) -> str:
    if score >= 80:
        return "강한 후보"
    if score >= 65:
        return "유망 후보"
    if score >= 50:
        return "혼합 신호"
    if score >= 35:
        return "주의 필요"
    return "높은 위험"


def _confidence_label(confidence: float) -> str:
    if confidence >= 80:
        return "높음"
    if confidence >= 60:
        return "보통"
    return "낮음"


def _reason_message(key: str, metric: ScoreMetric, tone: ReasonTone) -> str:
    label, direction = METRIC_DEFINITIONS[key]
    percentile = round(metric.percentile * 100)
    if direction == "lower":
        comparison = "낮아 긍정적입니다" if tone == "positive" else "높아 주의가 필요합니다"
    else:
        comparison = "높아 긍정적입니다" if tone == "positive" else "낮아 주의가 필요합니다"
    return f"{label} peer 백분위가 {percentile}로 {comparison}."


def _build_reasons(
    request: MarketScoreRequest,
    metrics: dict[str, ScoreMetric],
    cluster: ClusterResult,
) -> list[ScoreReason]:
    ranked: list[tuple[float, str, ScoreMetric]] = []
    for key, metric in metrics.items():
        if key not in METRIC_DEFINITIONS:
            continue
        ranked.append((_quality_percentile(key, metric), key, metric))

    positives = sorted((item for item in ranked if item[0] >= 0.65), reverse=True)[:2]
    cautions = sorted(item for item in ranked if item[0] <= 0.40)[:2]
    reasons: list[ScoreReason] = []

    for tone, items in (("positive", positives), ("caution", cautions)):
        for _, key, metric in items:
            reasons.append(
                ScoreReason(
                    tone=tone,
                    metric_key=key,
                    label=METRIC_DEFINITIONS[key][0],
                    message=_reason_message(key, metric, tone),
                    value=metric.value,
                    unit=metric.unit,
                    percentile=round(metric.percentile * 100, 1),
                    source_name=metric.source_name,
                    period=metric.period,
                )
            )

    if cluster.classification != "ordinary":
        reasons.append(
            ScoreReason(
                tone="positive"
                if cluster.adjustment > 0
                else "caution"
                if cluster.adjustment < 0
                else "info",
                metric_key="category_local_quotient",
                label="업종 집적효과",
                message=cluster.explanation,
                value=cluster.local_quotient,
                unit="LQ",
                percentile=0,
                source_name="점포 분포 파생지표",
                period="입력 지표와 동일",
            )
        )
    return reasons


def evaluate_market_score(request: MarketScoreRequest) -> MarketScoreResponse:
    eligible_metrics = {
        key: metric
        for key, metric in request.metrics.items()
        if key in METRIC_DEFINITIONS and metric.source_type != "fixture"
    }
    evidence_by_key = {
        key: _metric_evidence_result(key, metric) for key, metric in eligible_metrics.items()
    }
    component_results: list[ComponentResult] = []
    available_metric_weight = 0.0
    total_metric_weight = 0.0
    base_score = 0.0

    for key, (label, component_weight, metric_weights) in COMPONENT_DEFINITIONS.items():
        metric_values: list[tuple[float, float]] = []
        evidence_keys: list[str] = []
        component_available_weight = 0.0
        for metric_key, metric_weight in metric_weights.items():
            weighted_metric = component_weight * metric_weight
            total_metric_weight += weighted_metric
            metric = eligible_metrics.get(metric_key)
            if metric is None:
                continue
            metric_values.append((_quality_percentile(metric_key, metric), metric_weight))
            evidence_keys.append(metric_key)
            component_available_weight += metric_weight
            available_metric_weight += weighted_metric

        observed_score = _weighted_mean(metric_values) * 100 if metric_values else None
        component_score = (
            50 + component_available_weight * (observed_score - 50)
            if observed_score is not None
            else 50
        )
        base_score += component_score * component_weight
        component_results.append(
            ComponentResult(
                key=key,
                label=label,
                score=round(component_score, 1),
                weight_percent=round(component_weight * 100, 1),
                observed_score=round(observed_score, 1) if observed_score is not None else None,
                coverage=round(component_available_weight * 100, 1),
                configured_weight_percent=round(component_weight * 100, 1),
                evidence_keys=evidence_keys,
            )
        )

    cluster, cluster_evidence_too_weak = _cluster_result(request, eligible_metrics, evidence_by_key)
    score = min(100.0, max(0.0, base_score + cluster.adjustment))
    coverage = available_metric_weight / total_metric_weight if total_metric_weight else 0

    confidence = 0.0
    for _, component_weight, metric_weights in COMPONENT_DEFINITIONS.values():
        for metric_key, metric_weight in metric_weights.items():
            evidence = evidence_by_key.get(metric_key)
            if evidence is None:
                continue
            weight = component_weight * metric_weight
            confidence += evidence.evidence_strength * weight
    confidence *= 100

    expected_keys = set(METRIC_DEFINITIONS)
    missing_keys = sorted(expected_keys - eligible_metrics.keys())
    fixture_present = any(metric.source_type == "fixture" for metric in request.metrics.values())
    required_metric_missing = not REQUIRED_METRIC_KEYS.issubset(eligible_metrics)
    decision_blockers: list[str] = []
    if fixture_present:
        decision_blockers.append("fixture_present")
    if coverage < 0.60:
        decision_blockers.append("coverage_below_60")
    if confidence < 60:
        decision_blockers.append("confidence_below_60")
    if required_metric_missing:
        decision_blockers.append("required_metric_missing")
    if request.peer_sample_size is None or request.peer_sample_size < MINIMUM_PEER_SAMPLE_SIZE:
        decision_blockers.append("peer_sample_too_small")
    if cluster_evidence_too_weak:
        decision_blockers.append("cluster_evidence_too_weak")

    limitations: list[str] = []
    if missing_keys:
        missing_labels = [METRIC_DEFINITIONS[key][0] for key in missing_keys]
        limitations.append(
            f"누락 지표는 50점 중립 방향으로 반영했습니다: {', '.join(missing_labels)}"
        )
    if fixture_present:
        limitations.append("fixture가 포함되어 실제 입지 판단에는 사용할 수 없습니다.")
    if confidence < 60:
        limitations.append("근거 신뢰도가 낮아 점수보다 원자료와 누락 지표를 먼저 확인해야 합니다.")
    if request.peer_sample_size is None or request.peer_sample_size < MINIMUM_PEER_SAMPLE_SIZE:
        limitations.append(
            "peer group 표본이 30개 미만이거나 확인되지 않아 비교 판단을 지원하지 않습니다."
        )

    return MarketScoreResponse(
        formula_version=FORMULA_VERSION,
        market_id=request.market_id,
        market_name=request.market_name,
        category=request.category,
        peer_group=request.peer_group,
        score=round(score, 1),
        band=_score_band(score),
        decision_status="supported" if not decision_blockers else "insufficient_evidence",
        confidence=round(confidence, 1),
        confidence_label=_confidence_label(confidence),
        data_coverage=round(coverage * 100, 1),
        components=component_results,
        cluster=cluster,
        metric_evidence=list(evidence_by_key.values()),
        decision_blockers=decision_blockers,
        reasons=_build_reasons(request, eligible_metrics, cluster),
        limitations=limitations,
    )
