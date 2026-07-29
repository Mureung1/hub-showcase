"""평가 세트 채점.

사람이 확정한 기대 항목과 에이전트의 관측을 대조해 `evaluation_metrics` 행을 낸다.
컬럼과 제약은 docs/erd.md 13장, 지표의 분자와 분모는 docs/eval/README.md 의 지표
표에서 온다. 자료의 성격은 docs/data-strategy.md 9장이다.

순수 함수다. 저장소도 생성 모델도 부르지 않는다. 값 두 벌(기대와 관측)을 받아
지표와 실패 기록만 돌려주고, 그 값을 표에 넣는 것은 부르는 쪽의 몫이다. 규칙을 값
위에 두면 같은 입력에 같은 채점이 나오고, 채점을 다시 실행해도 분모가 흔들리지
않는다.

채점 방식은 `case_type` 다섯 종마다 다르다. 종류가 다르면 세는 단위와 분모가 다르며
한 지표로 합치면 어느 축이 떨어졌는지 알 수 없다.

| `case_type` | 채점 | 분모 |
| --- | --- | --- |
| `mention_extraction` | 정밀도·재현율·F1 | 관측 추출 수와 기대 항목 수 |
| `dimension_assignment` | 라벨 축과 깊이 축의 정확도 | 기대 항목 수 |
| `interpretation` | 루브릭 점수의 평균 | 기대 항목 수 |
| `strategy_linkage` | 연결 완전성 | 기대 항목 수 |
| `coverage` | `coverage_complete` 일치율 | 기대 항목 수 |

채점은 세트의 `status` 를 보지 않는다. 초안 세트도 추이를 보려면 채점해야 하기
때문이다. 그 결과를 릴리스 게이트로 쓸 수 있는가는
`careersignal.evaluation.acceptance` 가 판정한다.
"""

from __future__ import annotations

import hashlib
import json
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Any

from careersignal.evaluation.schema import (
    EvaluationCase,
    EvaluationCaseType,
    EvaluationSetFile,
    ExpectedItem,
)

# ------------------------------------------------------------ 지표 이름
MENTION_PRECISION = "mention_extraction.precision"
MENTION_RECALL = "mention_extraction.recall"
MENTION_F1 = "mention_extraction.f1"
DIMENSION_LABEL_ACCURACY = "dimension_assignment.label_accuracy"
DIMENSION_DEPTH_ACCURACY = "dimension_assignment.depth_accuracy"
INTERPRETATION_RUBRIC_SCORE = "interpretation.rubric_score"
STRATEGY_LINKAGE_COMPLETENESS = "strategy_linkage.completeness"
COVERAGE_MATCH_RATE = "coverage.match_rate"

METRIC_NAMES: tuple[str, ...] = (
    MENTION_PRECISION,
    MENTION_RECALL,
    MENTION_F1,
    DIMENSION_LABEL_ACCURACY,
    DIMENSION_DEPTH_ACCURACY,
    INTERPRETATION_RUBRIC_SCORE,
    STRATEGY_LINKAGE_COMPLETENESS,
    COVERAGE_MATCH_RATE,
)
"""이 모듈이 낼 수 있는 지표 이름 전부. 수용 정책이 고르는 대상이다."""

VALUE_SCALE = 6
"""`evaluation_metrics.value` 는 numeric(12,6) 이다. 자리를 넘기면 데이터베이스가 반올림한다."""

# ------------------------------------------------------------ 실패 사유
MISSING_MENTION = "기대 항목과 일치하는 추출이 없다"
SPURIOUS_MENTION = "기대 항목에 없는 추출이다"
MISSING_OBSERVATION = "기대 항목에 대응하는 관측이 없다"
LABEL_MISMATCH = "차원 라벨 집합이 기대와 다르다"
DEPTH_MISMATCH = "깊이 등급이 기대와 다르다"
NO_RUBRIC_JUDGMENT = "관측이 루브릭 판정을 담지 않았다"
RUBRIC_FAILED = "루브릭 판정이 오답이다"
BROKEN_LINKAGE = "기대한 연결 식별자가 관측에 없다"
COVERAGE_MISMATCH = "coverage_complete 가 기대와 다르다"


class ScoringError(ValueError):
    """채점 입력이 기대와 관측의 대조를 성립시키지 못한다."""


# ------------------------------------------------------------ 입력 값
@dataclass(frozen=True, slots=True)
class Observation:
    """관측 하나. 에이전트가 낸 산출물 한 조각이다.

    `expected_id` 는 어느 기대 항목에 대응하는가다. 추출 채점은 대응을 미리 알 수
    없으므로 비우고, 나머지 넷은 기대 항목마다 하나씩 대응하므로 채운다.
    """

    value: Mapping[str, Any]
    expected_id: str | None = None


@dataclass(frozen=True, slots=True)
class ObservedCase:
    """케이스 하나의 관측 묶음. `evaluation_cases.case_id` 로 기대와 잇는다."""

    case_id: str
    observations: tuple[Observation, ...] = ()


# ------------------------------------------------------------ 출력 값
@dataclass(frozen=True, slots=True)
class MetricValue:
    """`evaluation_metrics` 한 행의 값. `eval_run_id` 는 실행이 정한다."""

    metric_name: str
    value: float


@dataclass(frozen=True, slots=True)
class FailureRecord:
    """`evaluation_failures` 한 행의 값. `failure_id` 는 실행이 정한다.

    `expected_id` 는 nullable 이다. 기대 항목에 없는 추출은 가리킬 항목이 없다.
    """

    case_id: str
    reason: str
    expected_id: str | None = None
    observed_value: Mapping[str, Any] | None = None


@dataclass(frozen=True, slots=True)
class ScoringResult:
    """채점 한 번의 결과."""

    metrics: tuple[MetricValue, ...] = ()
    failures: tuple[FailureRecord, ...] = ()
    scored_case_types: tuple[EvaluationCaseType, ...] = ()
    """분모가 하나 이상이라 실제로 채점한 케이스 종류."""

    def metric(self, metric_name: str) -> float | None:
        """지표 하나의 값. 채점하지 않은 지표는 없다."""
        for entry in self.metrics:
            if entry.metric_name == metric_name:
                return entry.value
        return None

    def as_mapping(self) -> dict[str, float]:
        return {entry.metric_name: entry.value for entry in self.metrics}


# ------------------------------------------------------------ 채점
def score_evaluation_set(
    document: EvaluationSetFile, observations: Sequence[ObservedCase]
) -> ScoringResult:
    """평가 세트 파일 하나를 채점한다.

    관측이 없는 케이스도 채점한다. 아무것도 내지 못한 실행의 재현율은 0 이며, 그
    케이스를 분모에서 빼면 실행하지 않은 것과 구별되지 않는다.
    """
    by_case: dict[str, ObservedCase] = {}
    for observed in observations:
        if observed.case_id in by_case:
            raise ScoringError(
                f"case_id {observed.case_id} 의 관측이 두 번 있다."
                " 케이스 하나의 관측은 한 묶음이어야 분모가 정해진다"
            )
        by_case[observed.case_id] = observed

    tallies: dict[EvaluationCaseType, _Tally] = {}
    failures: list[FailureRecord] = []

    for index, case in enumerate(document.cases):
        case_id = case_key(case, index)
        observed = by_case.get(case_id, ObservedCase(case_id=case_id))
        tally = tallies.setdefault(case.case_type, _Tally())
        _SCORERS[case.case_type](case, case_id, observed, tally, failures)

    metrics: list[MetricValue] = []
    scored: list[EvaluationCaseType] = []
    for case_type, tally in tallies.items():
        produced = _METRICS[case_type](tally)
        if produced:
            scored.append(case_type)
        metrics.extend(produced)

    return ScoringResult(
        metrics=tuple(metrics),
        failures=tuple(failures),
        scored_case_types=tuple(scored),
    )


def case_key(case: EvaluationCase, index: int) -> str:
    """케이스를 가리키는 값.

    적재기가 만든 `case_id` 를 그대로 쓴다. 파일이 비워 두었으면 출처, 원문 파일,
    파일 안의 자리 순서로 가리킨다. 규칙은
    `careersignal.evaluation.loader._case_key` 와 같다. 적재기를 import 하면
    저장소가 따라오므로 채점은 규칙만 공유한다.
    """
    if case.case_id:
        return case.case_id
    return case.source_id or case.content_file or f"#{index}"


@dataclass(slots=True)
class _Tally:
    """케이스 종류 하나의 누적. 분모와 분자를 같은 자리에 모은다."""

    expected: int = 0
    observed: int = 0
    matched: int = 0
    label_matched: int = 0
    depth_matched: int = 0
    score: float = 0.0


# ------------------------------------------------------------ 종류별 채점
def _score_mention_extraction(
    case: EvaluationCase,
    case_id: str,
    observed: ObservedCase,
    tally: _Tally,
    failures: list[FailureRecord],
) -> None:
    """정밀도와 재현율의 분자를 센다.

    일치 판정은 docs/eval/README.md 를 따른다. `raw_expression` 이 같고
    `requiredness` 가 같으면 정답으로 센다. 기대 항목 하나는 관측 하나만 받는다.
    한 관측이 여러 기대 항목을 동시에 맞히면 정밀도가 재현율을 넘겨 부풀어 오른다.
    """
    remaining: dict[tuple[str, str], list[ExpectedItem]] = {}
    for item in case.expected_items:
        remaining.setdefault(_mention_key(item.expected_value), []).append(item)
    tally.expected += len(case.expected_items)
    tally.observed += len(observed.observations)

    for observation in observed.observations:
        bucket = remaining.get(_mention_key(observation.value))
        if bucket:
            bucket.pop(0)
            tally.matched += 1
            continue
        failures.append(
            FailureRecord(
                case_id=case_id,
                reason=SPURIOUS_MENTION,
                observed_value=observation.value,
            )
        )

    for bucket in remaining.values():
        for item in bucket:
            failures.append(
                FailureRecord(
                    case_id=case_id,
                    reason=MISSING_MENTION,
                    expected_id=item.expected_id,
                )
            )


def _score_dimension_assignment(
    case: EvaluationCase,
    case_id: str,
    observed: ObservedCase,
    tally: _Tally,
    failures: list[FailureRecord],
) -> None:
    """라벨 축과 깊이 축을 따로 센다. 분모는 둘 다 기대 항목 수다.

    근거는 docs/eval/README.md 의 차원 세트 지표 표와 `rb_dimension_assignment` 다.
    """
    index = _observation_index(observed)
    for item in case.expected_items:
        tally.expected += 1
        observation = _paired(item, index)
        if observation is None:
            failures.append(
                FailureRecord(
                    case_id=case_id,
                    reason=MISSING_OBSERVATION,
                    expected_id=item.expected_id,
                )
            )
            continue
        tally.observed += 1

        expected_labels = _label_set(item.expected_value)
        if expected_labels == _label_set(observation.value):
            tally.label_matched += 1
        else:
            failures.append(
                FailureRecord(
                    case_id=case_id,
                    reason=LABEL_MISMATCH,
                    expected_id=item.expected_id,
                    observed_value=observation.value,
                )
            )

        if item.expected_value.get("depth_level") == observation.value.get(
            "depth_level"
        ):
            tally.depth_matched += 1
        else:
            failures.append(
                FailureRecord(
                    case_id=case_id,
                    reason=DEPTH_MISMATCH,
                    expected_id=item.expected_id,
                    observed_value=observation.value,
                )
            )


def _score_interpretation(
    case: EvaluationCase,
    case_id: str,
    observed: ObservedCase,
    tally: _Tally,
    failures: list[FailureRecord],
) -> None:
    """루브릭 점수를 더한다.

    `pass_when` 의 문장을 이 모듈이 해석하지 않는다. 판정은 루브릭을 적용한 쪽이
    수행하고 관측에 결과를 담는다. `score` 가 있으면 0~1 의 값으로, 없으면
    `passed` 를 1 과 0 으로 읽는다. 둘 다 없으면 판정하지 않은 것이므로 0 이다.
    """
    index = _observation_index(observed)
    for item in case.expected_items:
        tally.expected += 1
        observation = _paired(item, index)
        if observation is None:
            failures.append(
                FailureRecord(
                    case_id=case_id,
                    reason=MISSING_OBSERVATION,
                    expected_id=item.expected_id,
                )
            )
            continue
        tally.observed += 1

        value = _rubric_score(observation.value)
        if value is None:
            failures.append(
                FailureRecord(
                    case_id=case_id,
                    reason=NO_RUBRIC_JUDGMENT,
                    expected_id=item.expected_id,
                    observed_value=observation.value,
                )
            )
            continue
        tally.score += value
        if value < 1.0:
            failures.append(
                FailureRecord(
                    case_id=case_id,
                    reason=RUBRIC_FAILED,
                    expected_id=item.expected_id,
                    observed_value=observation.value,
                )
            )


def _score_strategy_linkage(
    case: EvaluationCase,
    case_id: str,
    observed: ObservedCase,
    tally: _Tally,
    failures: list[FailureRecord],
) -> None:
    """연결 완전성을 센다.

    기대 항목이 요구하는 식별자를 관측이 하나도 빠뜨리지 않으면 정답이다. 근거는
    `rb_claim_strategy` 이며, 연결 없이 준비 방법만 제시한 주장은 오답이다. 해석에서
    로드맵까지의 사슬은 하나만 끊겨도 끊긴 것이므로 부분 점수를 주지 않는다.
    """
    index = _observation_index(observed)
    for item in case.expected_items:
        tally.expected += 1
        observation = _paired(item, index)
        if observation is None:
            failures.append(
                FailureRecord(
                    case_id=case_id,
                    reason=MISSING_OBSERVATION,
                    expected_id=item.expected_id,
                )
            )
            continue
        tally.observed += 1

        missing = sorted(_linked_ids(item.expected_value) - _linked_ids(observation.value))
        if not missing:
            tally.matched += 1
            continue
        failures.append(
            FailureRecord(
                case_id=case_id,
                reason=f"{BROKEN_LINKAGE}: {missing}",
                expected_id=item.expected_id,
                observed_value=observation.value,
            )
        )


def _score_coverage(
    case: EvaluationCase,
    case_id: str,
    observed: ObservedCase,
    tally: _Tally,
    failures: list[FailureRecord],
) -> None:
    """`coverage_complete` 일치율을 센다.

    근거는 `rb_claim_no_deviation` 이다. 전수 검사로 0 건을 확인했는가가 편차 없음
    출력의 조건이므로, 기대와 관측의 참·거짓이 같아야 정답이다. 관측이 값을 담지
    않으면 확인하지 않은 것이며 거짓과 같게 다루지 않고 오답으로 센다.
    """
    index = _observation_index(observed)
    for item in case.expected_items:
        tally.expected += 1
        observation = _paired(item, index)
        if observation is None:
            failures.append(
                FailureRecord(
                    case_id=case_id,
                    reason=MISSING_OBSERVATION,
                    expected_id=item.expected_id,
                )
            )
            continue
        tally.observed += 1

        expected_value = item.expected_value.get("coverage_complete")
        seen = observation.value.get("coverage_complete")
        if seen is not None and bool(seen) == bool(expected_value):
            tally.matched += 1
            continue
        failures.append(
            FailureRecord(
                case_id=case_id,
                reason=COVERAGE_MISMATCH,
                expected_id=item.expected_id,
                observed_value=observation.value,
            )
        )


_SCORERS: dict[EvaluationCaseType, Any] = {
    EvaluationCaseType.MENTION_EXTRACTION: _score_mention_extraction,
    EvaluationCaseType.DIMENSION_ASSIGNMENT: _score_dimension_assignment,
    EvaluationCaseType.INTERPRETATION: _score_interpretation,
    EvaluationCaseType.STRATEGY_LINKAGE: _score_strategy_linkage,
    EvaluationCaseType.COVERAGE: _score_coverage,
}


# ------------------------------------------------------------ 종류별 지표
def _mention_metrics(tally: _Tally) -> list[MetricValue]:
    precision = _ratio(tally.matched, tally.observed)
    recall = _ratio(tally.matched, tally.expected)
    metrics: list[MetricValue] = []
    if precision is not None:
        metrics.append(MetricValue(MENTION_PRECISION, precision))
    if recall is not None:
        metrics.append(MetricValue(MENTION_RECALL, recall))
    if precision is not None and recall is not None:
        total = precision + recall
        f1 = 0.0 if total == 0 else round(2 * precision * recall / total, VALUE_SCALE)
        metrics.append(MetricValue(MENTION_F1, f1))
    return metrics


def _dimension_metrics(tally: _Tally) -> list[MetricValue]:
    label = _ratio(tally.label_matched, tally.expected)
    depth = _ratio(tally.depth_matched, tally.expected)
    metrics: list[MetricValue] = []
    if label is not None:
        metrics.append(MetricValue(DIMENSION_LABEL_ACCURACY, label))
    if depth is not None:
        metrics.append(MetricValue(DIMENSION_DEPTH_ACCURACY, depth))
    return metrics


def _interpretation_metrics(tally: _Tally) -> list[MetricValue]:
    value = _ratio(tally.score, tally.expected)
    return [] if value is None else [MetricValue(INTERPRETATION_RUBRIC_SCORE, value)]


def _strategy_metrics(tally: _Tally) -> list[MetricValue]:
    value = _ratio(tally.matched, tally.expected)
    return (
        [] if value is None else [MetricValue(STRATEGY_LINKAGE_COMPLETENESS, value)]
    )


def _coverage_metrics(tally: _Tally) -> list[MetricValue]:
    value = _ratio(tally.matched, tally.expected)
    return [] if value is None else [MetricValue(COVERAGE_MATCH_RATE, value)]


_METRICS: dict[EvaluationCaseType, Any] = {
    EvaluationCaseType.MENTION_EXTRACTION: _mention_metrics,
    EvaluationCaseType.DIMENSION_ASSIGNMENT: _dimension_metrics,
    EvaluationCaseType.INTERPRETATION: _interpretation_metrics,
    EvaluationCaseType.STRATEGY_LINKAGE: _strategy_metrics,
    EvaluationCaseType.COVERAGE: _coverage_metrics,
}


# ------------------------------------------------------------ 대조 helper
def _ratio(numerator: float, denominator: int) -> float | None:
    """분모가 0 이면 지표를 내지 않는다.

    `evaluation_metrics.value` 는 NOT NULL 이다. 셀 것이 없는 자리에 0 을 넣으면
    아직 채점하지 않은 것과 전부 틀린 것이 같은 값이 된다.
    """
    if denominator == 0:
        return None
    return round(numerator / denominator, VALUE_SCALE)


def _normalize(text: Any) -> str:
    """공백만 접는다. 표기를 고치지 않는다.

    기대 항목의 문자열은 사람이 원문에서 잘라낸 값이므로 표기를 바꿔 맞히면
    정밀도가 실제보다 높게 나온다.
    """
    if not isinstance(text, str):
        return ""
    return " ".join(text.split())


def _mention_key(value: Mapping[str, Any]) -> tuple[str, str]:
    return _normalize(value.get("raw_expression")), _normalize(value.get("requiredness"))


def _label_set(value: Mapping[str, Any]) -> frozenset[str]:
    labels = value.get("dimension_labels")
    if not isinstance(labels, (list, tuple)):
        return frozenset()
    return frozenset(_normalize(label) for label in labels if isinstance(label, str))


def _linked_ids(value: Mapping[str, Any]) -> frozenset[str]:
    ids = value.get("linked_ids")
    if not isinstance(ids, (list, tuple)):
        return frozenset()
    return frozenset(_normalize(entry) for entry in ids if isinstance(entry, str))


def _rubric_score(value: Mapping[str, Any]) -> float | None:
    """관측이 담은 루브릭 판정. 0~1 밖의 값은 자른다."""
    raw = value.get("score")
    if isinstance(raw, (int, float)) and not isinstance(raw, bool):
        return min(1.0, max(0.0, float(raw)))
    passed = value.get("passed")
    if isinstance(passed, bool):
        return 1.0 if passed else 0.0
    return None


def _observation_index(
    observed: ObservedCase,
) -> tuple[dict[str, Observation], dict[tuple[str, str], Observation]]:
    """관측을 기대 항목과 잇는 두 색인.

    `expected_id` 가 먼저다. 차원 세트는 `mention_expected_id` 로 요구 표현 세트를
    가리키므로 그 값도 열쇠로 받는다. 식별자가 없으면 표현과 필수 여부로 잇는다.
    """
    by_id: dict[str, Observation] = {}
    by_mention: dict[tuple[str, str], Observation] = {}
    for observation in observed.observations:
        if observation.expected_id:
            by_id.setdefault(observation.expected_id, observation)
        pointer = observation.value.get("mention_expected_id")
        if isinstance(pointer, str):
            by_id.setdefault(pointer, observation)
        by_mention.setdefault(_mention_key(observation.value), observation)
    return by_id, by_mention


def _paired(
    item: ExpectedItem,
    index: tuple[dict[str, Observation], dict[tuple[str, str], Observation]],
) -> Observation | None:
    by_id, by_mention = index
    if item.expected_id and item.expected_id in by_id:
        return by_id[item.expected_id]
    pointer = item.expected_value.get("mention_expected_id")
    if isinstance(pointer, str) and pointer in by_id:
        return by_id[pointer]
    key = _mention_key(item.expected_value)
    if key != ("", ""):
        return by_mention.get(key)
    return None


# ------------------------------------------------------------ 표에 넣을 행
def failure_identifier(
    eval_run_id: str, case_id: str, expected_id: str | None, reason: str
) -> str:
    """실패 행의 식별자. 같은 실행의 같은 실패는 같은 식별자를 얻는다."""
    parts = (eval_run_id, case_id, expected_id or "", reason)
    digest = hashlib.sha256("\x1f".join(parts).encode("utf-8")).hexdigest()
    return f"fail_{digest[:24]}"


def metric_rows(eval_run_id: str, result: ScoringResult) -> list[dict[str, Any]]:
    """`evaluation_metrics` 행. 기본키는 `(eval_run_id, metric_name)` 이다."""
    return [
        {
            "eval_run_id": eval_run_id,
            "metric_name": entry.metric_name,
            "value": entry.value,
        }
        for entry in result.metrics
    ]


def failure_rows(eval_run_id: str, result: ScoringResult) -> list[dict[str, Any]]:
    """`evaluation_failures` 행.

    같은 실행에서 같은 사유가 같은 기대 항목에 두 번 나오면 행 하나로 접는다.
    `failure_id` 가 기본키이므로 같은 식별자를 두 번 넣을 수 없다.
    """
    rows: dict[str, dict[str, Any]] = {}
    for failure in result.failures:
        failure_id = failure_identifier(
            eval_run_id, failure.case_id, failure.expected_id, failure.reason
        )
        rows.setdefault(
            failure_id,
            {
                "failure_id": failure_id,
                "eval_run_id": eval_run_id,
                "case_id": failure.case_id,
                "expected_id": failure.expected_id,
                "observed_value": _observed_json(failure.observed_value),
                "reason": failure.reason,
            },
        )
    return list(rows.values())


def _observed_json(value: Mapping[str, Any] | None) -> dict[str, Any] | None:
    """jsonb 에 넣을 수 있는 값인지 확인한다.

    직렬화하지 못하는 값은 저장 시점이 아니라 채점 시점에 드러나야 한다. 그때는
    어느 관측이 문제인지 알 수 있다.
    """
    if value is None:
        return None
    plain = dict(value)
    try:
        json.dumps(plain, ensure_ascii=False)
    except TypeError as error:
        raise ScoringError(
            f"관측값을 jsonb 로 직렬화할 수 없다: {error}"
        ) from error
    return plain
