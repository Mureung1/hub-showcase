from fastapi.testclient import TestClient

from localtwin_api.main import app
from localtwin_api.market_score import MarketScoreRequest, ScoreMetric, evaluate_market_score


def metric(
    value: float,
    percentile: float,
    unit: str = "index",
    *,
    source_type: str = "official",
) -> ScoreMetric:
    return ScoreMetric(
        value=value,
        percentile=percentile,
        unit=unit,
        source_name="서울시 열린데이터광장",
        source_url="https://data.seoul.go.kr/",
        source_type=source_type,
        period="2025-Q1",
        sample_size=42,
        age_days=45,
    )


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
        metrics=metrics,
    )


def test_productive_cluster_receives_an_agglomeration_bonus() -> None:
    result = evaluate_market_score(request_for_cluster(productive=True))

    assert result.cluster.classification == "productive_cluster"
    assert 0 < result.cluster.adjustment <= 8
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
    assert any("fixture" in limitation for limitation in result.limitations)


def test_score_endpoint_returns_formula_and_evidence() -> None:
    response = TestClient(app).post(
        "/api/v1/scores/evaluate",
        json=request_for_cluster(productive=True).model_dump(),
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["formula_version"] == "1.0.0"
    assert payload["cluster"]["classification"] == "productive_cluster"
    assert payload["components"]
    assert payload["reasons"]
