"""평가 세트 채점과 수용 기준 판정 검증.

지표의 분자와 분모는 docs/eval/README.md, 컬럼은 docs/erd.md 13장에서 온다.
저장소 없이 값만으로 검증한다.
"""

from __future__ import annotations

import ast
from pathlib import Path
from typing import Any

import pytest
from pydantic import ValidationError

from careersignal.evaluation.acceptance import (
    CONFIRMED_STATUS,
    DRAFT_RUBRIC_REASON,
    DRAFT_SET_REASON,
    DRAFT_STATUS,
    MISSING_METRIC,
    NO_STATUS_REASON,
    AcceptancePolicy,
    AcceptanceVerdict,
    Threshold,
    catalog_status,
    gating_reason,
    judge_acceptance,
)
from careersignal.evaluation.schema import EvaluationSetFile, RubricCatalog
from careersignal.evaluation.scoring import (
    COVERAGE_MATCH_RATE,
    DIMENSION_DEPTH_ACCURACY,
    DIMENSION_LABEL_ACCURACY,
    INTERPRETATION_RUBRIC_SCORE,
    MENTION_F1,
    MENTION_PRECISION,
    MENTION_RECALL,
    MISSING_MENTION,
    MISSING_OBSERVATION,
    SPURIOUS_MENTION,
    STRATEGY_LINKAGE_COMPLETENESS,
    Observation,
    ObservedCase,
    ScoringError,
    failure_identifier,
    failure_rows,
    metric_rows,
    score_evaluation_set,
)

EVAL_DIR = Path(__file__).resolve().parents[3] / "docs" / "eval"
RUBRIC_FILE = EVAL_DIR / "rubrics_v1.json"
EVAL_FILE = EVAL_DIR / "backend_v1.json"

RUN_ID = "evalrun_1"


def _document(case_type: str, items: list[dict[str, Any]], **case: Any) -> EvaluationSetFile:
    """케이스 하나를 담은 세트."""
    payload: dict[str, Any] = {
        "job_role_id": "backend",
        "source_file": "docs/eval/test.json",
        "cases": [
            {"case_id": "case_1", "case_type": case_type, "expected_items": items}
            | case
        ],
    }
    return EvaluationSetFile.model_validate(payload)


def _mention(expression: str, requiredness: str, expected_id: str) -> dict[str, Any]:
    return {
        "expected_id": expected_id,
        "expected_field": "requirement_mention",
        "expected_value": {
            "raw_expression": expression,
            "requiredness": requiredness,
        },
    }


# ------------------------------------------------------------ 20-1 추출 채점
def test_mention_extraction_scores_precision_recall_and_f1() -> None:
    """정밀도의 분모는 관측 수, 재현율의 분모는 기대 항목 수다."""
    document = _document(
        "mention_extraction",
        [
            _mention("Java 서버 개발 경험", "required", "exp_1"),
            _mention("Kubernetes 운영 경험", "preferred", "exp_2"),
        ],
    )
    observed = ObservedCase(
        case_id="case_1",
        observations=(
            Observation(value={"raw_expression": "Java 서버 개발 경험", "requiredness": "required"}),
            Observation(value={"raw_expression": "사내 동호회 지원", "requiredness": "required"}),
            Observation(value={"raw_expression": "재택근무", "requiredness": "preferred"}),
        ),
    )

    result = score_evaluation_set(document, [observed])

    assert result.metric(MENTION_PRECISION) == pytest.approx(1 / 3, abs=1e-6)
    assert result.metric(MENTION_RECALL) == pytest.approx(0.5)
    assert result.metric(MENTION_F1) == pytest.approx(0.4, abs=1e-6)


def test_mention_extraction_records_both_failure_directions() -> None:
    """놓친 기대 항목과 기대에 없는 추출을 각각 남긴다."""
    document = _document(
        "mention_extraction", [_mention("Java 서버 개발 경험", "required", "exp_1")]
    )
    observed = ObservedCase(
        case_id="case_1",
        observations=(
            Observation(value={"raw_expression": "복지 포인트", "requiredness": "required"}),
        ),
    )

    result = score_evaluation_set(document, [observed])
    reasons = {failure.reason for failure in result.failures}

    assert reasons == {MISSING_MENTION, SPURIOUS_MENTION}
    missing = next(f for f in result.failures if f.reason == MISSING_MENTION)
    spurious = next(f for f in result.failures if f.reason == SPURIOUS_MENTION)
    assert missing.expected_id == "exp_1"
    assert spurious.expected_id is None


def test_requiredness_difference_is_not_a_match() -> None:
    """표현이 같아도 구간 라벨이 다르면 정답이 아니다."""
    document = _document(
        "mention_extraction", [_mention("Java 서버 개발 경험", "required", "exp_1")]
    )
    observed = ObservedCase(
        case_id="case_1",
        observations=(
            Observation(
                value={"raw_expression": "Java 서버 개발 경험", "requiredness": "preferred"}
            ),
        ),
    )

    result = score_evaluation_set(document, [observed])

    assert result.metric(MENTION_RECALL) == pytest.approx(0.0)
    assert result.metric(MENTION_PRECISION) == pytest.approx(0.0)


def test_one_observation_does_not_match_two_expected_items() -> None:
    """기대 항목 하나는 관측 하나만 받는다. 정밀도가 재현율을 넘겨 부풀지 않는다."""
    document = _document(
        "mention_extraction",
        [
            _mention("Java 서버 개발 경험", "required", "exp_1"),
            _mention("Java 서버 개발 경험", "required", "exp_2"),
        ],
    )
    observed = ObservedCase(
        case_id="case_1",
        observations=(
            Observation(value={"raw_expression": "Java 서버 개발 경험", "requiredness": "required"}),
        ),
    )

    result = score_evaluation_set(document, [observed])

    assert result.metric(MENTION_PRECISION) == pytest.approx(1.0)
    assert result.metric(MENTION_RECALL) == pytest.approx(0.5)


def test_case_without_observation_is_still_a_denominator() -> None:
    """관측이 없는 케이스도 분모에 남는다. 실행하지 않은 것과 구별한다."""
    document = _document(
        "mention_extraction", [_mention("Java 서버 개발 경험", "required", "exp_1")]
    )

    result = score_evaluation_set(document, [])

    assert result.metric(MENTION_RECALL) == pytest.approx(0.0)
    assert result.metric(MENTION_PRECISION) is None
    assert [f.reason for f in result.failures] == [MISSING_MENTION]


# ------------------------------------------------------------ 20-1 차원 채점
def _dimension_item(expected_id: str, labels: list[str], depth: str) -> dict[str, Any]:
    return {
        "expected_id": expected_id,
        "expected_field": "dimension_assignment",
        "expected_value": {
            "mention_expected_id": f"mention_{expected_id}",
            "dimension_labels": labels,
            "depth_level": depth,
        },
        "rubric": "rb_dimension_assignment",
    }


def test_dimension_assignment_scores_two_axes() -> None:
    """라벨 축과 깊이 축의 분모는 둘 다 기대 항목 수다."""
    document = _document(
        "dimension_assignment",
        [
            _dimension_item("exp_1", ["대용량 트래픽과 고가용성"], "tradeoff"),
            _dimension_item("exp_2", ["관계형 데이터베이스"], "application"),
        ],
    )
    observed = ObservedCase(
        case_id="case_1",
        observations=(
            Observation(
                expected_id="exp_1",
                value={"dimension_labels": ["대용량 트래픽과 고가용성"], "depth_level": "tradeoff"},
            ),
            Observation(
                expected_id="exp_2",
                value={"dimension_labels": ["관계형 데이터베이스"], "depth_level": "foundation"},
            ),
        ),
    )

    result = score_evaluation_set(document, [observed])

    assert result.metric(DIMENSION_LABEL_ACCURACY) == pytest.approx(1.0)
    assert result.metric(DIMENSION_DEPTH_ACCURACY) == pytest.approx(0.5)


def test_extra_dimension_label_is_a_label_failure() -> None:
    """기대에 없는 라벨을 더하면 라벨 축에서 오답이다."""
    document = _document(
        "dimension_assignment", [_dimension_item("exp_1", ["관계형 데이터베이스"], "application")]
    )
    observed = ObservedCase(
        case_id="case_1",
        observations=(
            Observation(
                expected_id="exp_1",
                value={
                    "dimension_labels": ["관계형 데이터베이스", "캐시"],
                    "depth_level": "application",
                },
            ),
        ),
    )

    result = score_evaluation_set(document, [observed])

    assert result.metric(DIMENSION_LABEL_ACCURACY) == pytest.approx(0.0)
    assert result.metric(DIMENSION_DEPTH_ACCURACY) == pytest.approx(1.0)


def test_observation_pairs_by_mention_expected_id() -> None:
    """차원 세트는 요구 표현 세트의 식별자로 관측과 이어진다."""
    document = _document(
        "dimension_assignment", [_dimension_item("exp_1", ["캐시"], "application")]
    )
    observed = ObservedCase(
        case_id="case_1",
        observations=(
            Observation(
                value={
                    "mention_expected_id": "mention_exp_1",
                    "dimension_labels": ["캐시"],
                    "depth_level": "application",
                }
            ),
        ),
    )

    result = score_evaluation_set(document, [observed])

    assert result.metric(DIMENSION_LABEL_ACCURACY) == pytest.approx(1.0)
    assert result.failures == ()


# ------------------------------------------------------------ 20-1 나머지 셋
def test_interpretation_averages_the_rubric_scores() -> None:
    """루브릭 점수의 평균이다. 판정은 관측이 담고 이 모듈은 세기만 한다."""
    document = _document(
        "interpretation",
        [
            {
                "expected_id": "exp_1",
                "expected_field": "analysis_claim",
                "expected_value": {"claim_type": "explicit_requirement"},
                "rubric": "rb_interp_explicit",
            },
            {
                "expected_id": "exp_2",
                "expected_field": "analysis_claim",
                "expected_value": {"claim_type": "inferred_requirement"},
                "rubric": "rb_interp_inferred",
            },
        ],
    )
    observed = ObservedCase(
        case_id="case_1",
        observations=(
            Observation(expected_id="exp_1", value={"passed": True}),
            Observation(expected_id="exp_2", value={"score": 0.5}),
        ),
    )

    result = score_evaluation_set(document, [observed])

    assert result.metric(INTERPRETATION_RUBRIC_SCORE) == pytest.approx(0.75)


def test_strategy_linkage_needs_every_identifier() -> None:
    """사슬은 하나만 끊겨도 끊긴 것이다. 부분 점수를 주지 않는다."""
    document = _document(
        "strategy_linkage",
        [
            {
                "expected_id": "exp_1",
                "expected_field": "strategy_linkage",
                "expected_value": {"linked_ids": ["claim_1", "check_1", "road_1"]},
                "rubric": "rb_claim_strategy",
            }
        ],
    )
    complete = ObservedCase(
        case_id="case_1",
        observations=(
            Observation(
                expected_id="exp_1",
                value={"linked_ids": ["claim_1", "check_1", "road_1", "road_2"]},
            ),
        ),
    )
    broken = ObservedCase(
        case_id="case_1",
        observations=(
            Observation(expected_id="exp_1", value={"linked_ids": ["claim_1", "check_1"]}),
        ),
    )

    assert score_evaluation_set(document, [complete]).metric(
        STRATEGY_LINKAGE_COMPLETENESS
    ) == pytest.approx(1.0)
    outcome = score_evaluation_set(document, [broken])
    assert outcome.metric(STRATEGY_LINKAGE_COMPLETENESS) == pytest.approx(0.0)
    assert "road_1" in outcome.failures[0].reason


def test_coverage_counts_the_agreement_of_coverage_complete() -> None:
    """`coverage_complete` 가 같아야 정답이다. 값을 담지 않은 관측은 오답이다."""
    document = _document(
        "coverage",
        [
            {
                "expected_id": "exp_1",
                "expected_field": "coverage_assertion",
                "expected_value": {"coverage_complete": True},
                "rubric": "rb_claim_no_deviation",
            },
            {
                "expected_id": "exp_2",
                "expected_field": "coverage_assertion",
                "expected_value": {"coverage_complete": False},
                "rubric": "rb_claim_no_deviation",
            },
        ],
    )
    observed = ObservedCase(
        case_id="case_1",
        observations=(
            Observation(expected_id="exp_1", value={"coverage_complete": True}),
            Observation(expected_id="exp_2", value={"note": "판단 근거 부족"}),
        ),
    )

    result = score_evaluation_set(document, [observed])

    assert result.metric(COVERAGE_MATCH_RATE) == pytest.approx(0.5)


def test_missing_observation_is_recorded_for_paired_case_types() -> None:
    document = _document(
        "coverage",
        [
            {
                "expected_id": "exp_1",
                "expected_field": "coverage_assertion",
                "expected_value": {"coverage_complete": True},
            }
        ],
    )

    result = score_evaluation_set(document, [])

    assert [f.reason for f in result.failures] == [MISSING_OBSERVATION]


def test_duplicate_observed_case_is_rejected() -> None:
    document = _document(
        "mention_extraction", [_mention("Java 서버 개발 경험", "required", "exp_1")]
    )
    duplicate = [ObservedCase(case_id="case_1"), ObservedCase(case_id="case_1")]

    with pytest.raises(ScoringError):
        score_evaluation_set(document, duplicate)


# ------------------------------------------------------------ 표에 넣을 행
def test_metric_and_failure_rows_carry_the_run_identifier() -> None:
    """행은 `evaluation_metrics` 와 `evaluation_failures` 의 컬럼과 같은 열쇠를 갖는다."""
    document = _document(
        "mention_extraction", [_mention("Java 서버 개발 경험", "required", "exp_1")]
    )
    result = score_evaluation_set(document, [])

    metrics = metric_rows(RUN_ID, result)
    failures = failure_rows(RUN_ID, result)

    assert {row["metric_name"] for row in metrics} == {MENTION_RECALL}
    assert all(row["eval_run_id"] == RUN_ID for row in metrics + failures)
    assert set(failures[0]) == {
        "failure_id",
        "eval_run_id",
        "case_id",
        "expected_id",
        "observed_value",
        "reason",
    }


def test_failure_identifier_is_deterministic_and_scoped_to_the_run() -> None:
    first = failure_identifier(RUN_ID, "case_1", "exp_1", MISSING_MENTION)
    same = failure_identifier(RUN_ID, "case_1", "exp_1", MISSING_MENTION)
    other_run = failure_identifier("evalrun_2", "case_1", "exp_1", MISSING_MENTION)

    assert first == same
    assert first != other_run
    assert first.startswith("fail_")


def test_repeated_failures_collapse_to_one_row() -> None:
    """`failure_id` 는 기본키다. 같은 실패를 두 행으로 넣지 않는다."""
    document = _document(
        "mention_extraction",
        [
            _mention("Java 서버 개발 경험", "required", None),
            _mention("Java 서버 개발 경험", "required", None),
        ],
    )

    rows = failure_rows(RUN_ID, score_evaluation_set(document, []))

    assert len(rows) == 1


def test_case_identifier_falls_back_to_the_source() -> None:
    """`case_id` 를 비운 파일도 채점한다. 적재기와 같은 규칙으로 가리킨다."""
    document = EvaluationSetFile.model_validate(
        {
            "job_role_id": "backend",
            "source_file": "docs/eval/test.json",
            "cases": [
                {
                    "case_type": "mention_extraction",
                    "source_id": "src_daangn",
                    "expected_items": [_mention("Java", "required", "exp_1")],
                }
            ],
        }
    )
    observed = ObservedCase(
        case_id="src_daangn",
        observations=(Observation(value={"raw_expression": "Java", "requiredness": "required"}),),
    )

    assert score_evaluation_set(document, [observed]).metric(
        MENTION_RECALL
    ) == pytest.approx(1.0)


# ------------------------------------------------------------ 20-2 수용 기준
def _policy(**kwargs: Any) -> AcceptancePolicy:
    return AcceptancePolicy(
        acceptance_policy_version=kwargs.get("version", "ap_v1"),
        rubric_set_id="rubrics_v1",
        thresholds=(
            Threshold(metric_name=MENTION_PRECISION, minimum=0.7),
            Threshold(metric_name=MENTION_RECALL, minimum=0.7),
        ),
    )


def test_acceptance_passes_when_every_threshold_is_met() -> None:
    decision = judge_acceptance(
        {MENTION_PRECISION: 0.8, MENTION_RECALL: 0.75},
        _policy(),
        set_status=CONFIRMED_STATUS,
        rubric_status=CONFIRMED_STATUS,
    )

    assert decision.verdict is AcceptanceVerdict.PASS
    assert decision.blocks_activation is False
    assert decision.measured == (MENTION_PRECISION, MENTION_RECALL)


def test_acceptance_fails_and_names_the_shortfall() -> None:
    decision = judge_acceptance(
        {MENTION_PRECISION: 0.8, MENTION_RECALL: 0.4},
        _policy(),
        set_status=CONFIRMED_STATUS,
        rubric_status=CONFIRMED_STATUS,
    )

    assert decision.verdict is AcceptanceVerdict.FAIL
    assert decision.blocks_activation is True
    assert [entry.metric_name for entry in decision.shortfalls] == [MENTION_RECALL]
    assert decision.shortfalls[0].bound == 0.7


def test_unscored_metric_is_a_shortfall() -> None:
    """기준에 적힌 지표를 재지 못한 실행은 그 축을 통과했다고 말할 수 없다."""
    decision = judge_acceptance(
        {MENTION_PRECISION: 0.9},
        _policy(),
        set_status=CONFIRMED_STATUS,
        rubric_status=CONFIRMED_STATUS,
    )

    assert decision.verdict is AcceptanceVerdict.FAIL
    assert decision.shortfalls[0].reason == MISSING_METRIC
    assert decision.shortfalls[0].observed is None


def test_maximum_bound_catches_a_ratio_that_should_stay_low() -> None:
    policy = AcceptancePolicy(
        acceptance_policy_version="ap_v1",
        rubric_set_id="rubrics_v1",
        thresholds=(Threshold(metric_name="interpretation.unsupported_ratio", maximum=0.1),),
    )

    decision = judge_acceptance(
        {"interpretation.unsupported_ratio": 0.3},
        policy,
        set_status=CONFIRMED_STATUS,
        rubric_status=CONFIRMED_STATUS,
    )

    assert decision.verdict is AcceptanceVerdict.FAIL
    assert "이하" in decision.shortfalls[0].reason


def test_draft_set_is_scored_but_not_gating() -> None:
    """초안 세트는 추이로만 쓴다. 미달과 구별되는 판정이다."""
    decision = judge_acceptance(
        {MENTION_PRECISION: 0.1, MENTION_RECALL: 0.1},
        _policy(),
        set_status=DRAFT_STATUS,
        rubric_status=CONFIRMED_STATUS,
    )

    assert decision.verdict is AcceptanceVerdict.NOT_GATING
    assert decision.blocks_activation is False
    assert decision.shortfalls == ()
    assert DRAFT_SET_REASON in decision.reason


def test_draft_rubric_is_not_gating_even_with_a_confirmed_set() -> None:
    decision = judge_acceptance(
        {MENTION_PRECISION: 0.1, MENTION_RECALL: 0.1},
        _policy(),
        set_status=CONFIRMED_STATUS,
        rubric_status=DRAFT_STATUS,
    )

    assert decision.verdict is AcceptanceVerdict.NOT_GATING
    assert DRAFT_RUBRIC_REASON in decision.reason


def test_gating_reason_requires_an_explicit_status() -> None:
    assert gating_reason(None) == NO_STATUS_REASON
    assert gating_reason(DRAFT_STATUS) == DRAFT_SET_REASON
    assert gating_reason(CONFIRMED_STATUS, DRAFT_STATUS) == DRAFT_RUBRIC_REASON
    assert gating_reason(CONFIRMED_STATUS, CONFIRMED_STATUS) is None


def test_threshold_without_a_bound_is_rejected() -> None:
    with pytest.raises(ValidationError):
        Threshold(metric_name=MENTION_RECALL)


def test_policy_rejects_two_thresholds_for_one_metric() -> None:
    with pytest.raises(ValidationError):
        AcceptancePolicy(
            acceptance_policy_version="ap_v1",
            rubric_set_id="rubrics_v1",
            thresholds=(
                Threshold(metric_name=MENTION_RECALL, minimum=0.5),
                Threshold(metric_name=MENTION_RECALL, minimum=0.9),
            ),
        )


# ------------------------------------------------------------ 실제 자료
@pytest.mark.skipif(not RUBRIC_FILE.exists(), reason="docs/eval/rubrics_v1.json 이 없다")
def test_shipped_rubric_catalog_is_draft_and_therefore_not_gating() -> None:
    """저장소가 담은 루브릭 정책은 초안이다. 지금은 어떤 채점도 게이트가 아니다."""
    catalog = RubricCatalog.load(RUBRIC_FILE)

    assert catalog_status(catalog) == DRAFT_STATUS
    assert gating_reason(CONFIRMED_STATUS, catalog_status(catalog)) == DRAFT_RUBRIC_REASON
    assert catalog_status(None) is None


@pytest.mark.skipif(not EVAL_FILE.exists(), reason="docs/eval/backend_v1.json 이 없다")
def test_shipped_evaluation_set_scores_a_perfect_replay() -> None:
    """기대 항목을 그대로 관측으로 되돌리면 두 지표가 1 이 된다."""
    document = EvaluationSetFile.load(EVAL_FILE)
    observed = [
        ObservedCase(
            case_id=case.case_id or f"#{index}",
            observations=tuple(
                Observation(expected_id=item.expected_id, value=dict(item.expected_value))
                for item in case.expected_items
            ),
        )
        for index, case in enumerate(document.cases)
    ]

    result = score_evaluation_set(document, observed)

    assert result.metric(MENTION_PRECISION) == pytest.approx(1.0)
    assert result.metric(MENTION_RECALL) == pytest.approx(1.0)
    assert result.failures == ()


# ------------------------------------------------------------ 순수성
SRC = Path(__file__).resolve().parents[2] / "src" / "careersignal" / "evaluation"

PURE_MODULES = ("scoring.py", "acceptance.py")
"""저장소를 import 하지 않는다고 스스로 적은 채점 모듈.

`evaluation/` 전체가 순수하지 않다. `loader` 는 저장소를 받아 세 표에 넣고
`gate` 는 `Protocol` 로 저장소를 받는다. 이 둘은 값만 받아 판정하므로 저장소 없이
검사할 수 있고, 그 성질이 깨지면 값만으로 검사하던 테스트가 데이터베이스를 요구한다.
"""

FORBIDDEN = {
    "psycopg",
    "sqlalchemy",
    "alembic",
    "openai",
    "httpx",
    "requests",
    "supabase",
    "fastapi",
    "careersignal.repositories",
    "careersignal.providers",
    "careersignal.agents",
    "careersignal.orchestration",
    "careersignal.evaluation.loader",
}


def _imports(path: Path) -> set[str]:
    tree = ast.parse(path.read_text(encoding="utf-8"))
    found: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            found.update(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            found.add(node.module)
    return found


def test_scoring_and_acceptance_have_no_repository_imports() -> None:
    bad: list[str] = []
    for name in PURE_MODULES:
        path = SRC / name
        for imported in _imports(path):
            if imported in FORBIDDEN or imported.split(".")[0] in FORBIDDEN:
                bad.append(f"{name} -> {imported}")
    assert bad == []
