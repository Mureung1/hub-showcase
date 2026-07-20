import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from localtwin_api.main import app
from localtwin_api.market_score import MarketScoreRequest, ScoreMetric, evaluate_market_score


def metric(
    value: float,
    percentile: float,
    unit: str = "index",
    *,
    source_type: str = "official",
    age_days: int = 45,
    reliability: float = 1,
    sample_size: int | None = 42,
    sample_basis: str | None = None,
) -> ScoreMetric:
    payload = {
        "value": value,
        "percentile": percentile,
        "unit": unit,
        "source_name": "서울시 열린데이터광장",
        "source_url": "https://data.seoul.go.kr/",
        "source_type": source_type,
        "period": "2025-Q1",
        "sample_size": sample_size,
        "age_days": age_days,
        "reliability": reliability,
    }
    if sample_basis is not None:
        payload["sample_basis"] = sample_basis
    return ScoreMetric.model_validate(payload)


def request_for_cluster(*, productive: bool) -> MarketScoreRequest:
    metrics = {
        "sales_per_store": metric(
            18_000_000 if productive else 6_000_000, 0.78 if productive else 0.28, "KRW"
        ),
        "foot_traffic": metric(
            52_000 if productive else 19_000, 0.82 if productive else 0.38, "people"
        ),
        "demand_growth": metric(8.2 if productive else -4.1, 0.76 if productive else 0.25, "%"),
        "survival_rate": metric(
            0.74 if productive else 0.39, 0.72 if productive else 0.30, "ratio"
        ),
        "closure_rate": metric(0.12 if productive else 0.36, 0.25 if productive else 0.82, "ratio"),
        "same_category_density": metric(24, 0.91, "stores/km2"),
        "market_diversity": metric(0.67, 0.62, "index"),
        "sales_growth": metric(7.1 if productive else -8.0, 0.74 if productive else 0.22, "%"),
        "net_opening_rate": metric(3.2 if productive else -5.3, 0.68 if productive else 0.18, "%"),
        "transit_access": metric(0.81, 0.78, "index"),
        "walkability": metric(0.73, 0.70, "index"),
    }
    return MarketScoreRequest(
        market_id="market-bakery",
        market_name="베이커리 특화거리",
        category="베이커리",
        peer_group="서울·골목상권·베이커리·2025-Q1",
        local_category_store_count=14,
        local_total_store_count=40,
        peer_category_share=0.10,
        peer_sample_size=42,
        metrics=metrics,
    )


def test_productive_cluster_receives_an_agglomeration_bonus() -> None:
    result = evaluate_market_score(request_for_cluster(productive=True))

    assert result.cluster.classification == "productive_cluster"
    assert 0 < result.cluster.adjustment <= 8
    assert result.cluster.evidence_confidence >= 0.60
    assert result.cluster.adjustment == pytest.approx(
        round(result.cluster.raw_adjustment * result.cluster.evidence_confidence, 1), abs=0.1
    )
    assert result.data_coverage == 100
    assert result.score >= 65
    assert result.decision_status == "supported"
    assert any(reason.metric_key == "category_local_quotient" for reason in result.reasons)


def test_saturated_cluster_receives_a_penalty() -> None:
    productive = evaluate_market_score(request_for_cluster(productive=True))
    saturated = evaluate_market_score(request_for_cluster(productive=False))

    assert saturated.cluster.classification == "saturated_cluster"
    assert -8 <= saturated.cluster.adjustment < 0
    assert saturated.score < productive.score


def test_missing_and_fixture_metrics_reduce_confidence() -> None:
    request = request_for_cluster(productive=True)
    request.metrics = {
        "foot_traffic": metric(52_000, 0.82, "people", source_type="fixture"),
        "same_category_density": metric(24, 0.91, "stores/km2", source_type="fixture"),
    }

    result = evaluate_market_score(request)

    assert result.confidence < 60
    assert result.decision_status == "insufficient_evidence"
    assert result.data_coverage < 50
    assert "fixture_present" in result.decision_blockers
    assert any("fixture" in limitation for limitation in result.limitations)


def test_score_endpoint_returns_formula_and_evidence() -> None:
    response = TestClient(app).post(
        "/api/v1/scores/evaluate",
        json=request_for_cluster(productive=True).model_dump(),
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["formula_version"] == "1.1.0"
    assert payload["cluster"]["classification"] == "productive_cluster"
    assert payload["components"]
    assert payload["reasons"]


def test_one_metric_shrinks_component_toward_neutral() -> None:
    request = request_for_cluster(productive=True)
    request.metrics = {"sales_per_store": metric(18_000_000, 0.80, "KRW")}

    result = evaluate_market_score(request)
    demand = next(component for component in result.components if component.key == "demand")

    assert demand.observed_score == 80
    assert demand.coverage == 45
    assert demand.score == 63.5
    assert result.score == 54.0
    assert result.data_coverage == 13.5


def test_no_metrics_returns_neutral_unsupported_score() -> None:
    request = request_for_cluster(productive=True)
    request.metrics = {}

    result = evaluate_market_score(request)

    assert result.score == 50
    assert result.data_coverage == 0
    assert result.confidence == 0
    assert result.decision_status == "insufficient_evidence"
    assert all(component.score == 50 for component in result.components)


def test_full_fixture_is_excluded_from_all_decision_calculations() -> None:
    request = request_for_cluster(productive=True)
    request.metrics = {
        key: value.model_copy(update={"source_type": "fixture"})
        for key, value in request.metrics.items()
    }

    result = evaluate_market_score(request)

    assert result.score == 50
    assert result.data_coverage == 0
    assert result.confidence == 0
    assert result.metric_evidence == []
    assert all(reason.metric_key == "category_local_quotient" for reason in result.reasons)
    assert "fixture_present" in result.decision_blockers


def test_freshness_uses_metric_specific_grace_and_expire_periods() -> None:
    request = request_for_cluster(productive=True)
    request.metrics = {
        "sales_per_store": metric(10, 0.8, age_days=730),
        "transit_access": metric(10, 0.8, age_days=365),
    }

    result = evaluate_market_score(request)
    evidence = {row.metric_key: row for row in result.metric_evidence}

    assert evidence["sales_per_store"].freshness_policy == "fast"
    assert evidence["sales_per_store"].freshness == 0
    assert evidence["transit_access"].freshness_policy == "structural"
    assert evidence["transit_access"].freshness == 1


def test_sample_basis_distinguishes_unknown_and_administrative_population() -> None:
    request = request_for_cluster(productive=True)
    request.metrics = {
        "sales_per_store": metric(10, 0.8, sample_size=None, sample_basis="unknown"),
        "foot_traffic": metric(
            10,
            0.8,
            sample_size=None,
            sample_basis="administrative_population",
        ),
    }

    result = evaluate_market_score(request)
    evidence = {row.metric_key: row for row in result.metric_evidence}

    assert evidence["sales_per_store"].sample_strength == 0.4
    assert evidence["foot_traffic"].sample_strength == 1


def test_explicit_unknown_sample_basis_rejects_sample_size() -> None:
    with pytest.raises(ValidationError):
        metric(10, 0.8, sample_size=10, sample_basis="unknown")


def test_tiny_market_cannot_receive_cluster_adjustment() -> None:
    request = request_for_cluster(productive=True)
    request.local_total_store_count = 6
    request.local_category_store_count = 5

    result = evaluate_market_score(request)

    assert result.cluster.classification == "ordinary"
    assert result.cluster.adjustment == 0


def test_weak_cluster_evidence_blocks_adjustment() -> None:
    request = request_for_cluster(productive=True)
    request.metrics = {
        key: value.model_copy(update={"reliability": 0}) for key, value in request.metrics.items()
    }

    result = evaluate_market_score(request)

    assert result.cluster.classification == "specialized_watch"
    assert result.cluster.adjustment == 0
    assert result.cluster.evidence_confidence < 0.60
    assert "cluster_evidence_too_weak" in result.decision_blockers


def test_supported_requires_coverage_required_metrics_and_peer_sample() -> None:
    request = request_for_cluster(productive=True)
    request.peer_sample_size = 29

    result = evaluate_market_score(request)

    assert result.decision_status == "insufficient_evidence"
    assert "peer_sample_too_small" in result.decision_blockers


def test_legacy_request_without_new_fields_remains_accepted() -> None:
    payload = request_for_cluster(productive=True).model_dump()
    payload.pop("peer_sample_size")
    for value in payload["metrics"].values():
        value.pop("sample_basis")

    response = TestClient(app).post("/api/v1/scores/evaluate", json=payload)

    assert response.status_code == 200
    assert response.json()["formula_version"] == "1.1.0"
    assert "peer_sample_too_small" in response.json()["decision_blockers"]
