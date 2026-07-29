"""Stage D 통합 실행 스크립트의 계산 검증.

`scripts/stage_d.py` 는 패키지가 아니라 실행 스크립트라 `pytest` 가 수집하지
않는다. 여기서는 파일 경로로 불러와 순수 함수만 검사한다. 저장소에 붙지 않고
모델을 호출하지 않으며 스크립트 전체를 돌리지 않는다.

검사 대상은 다섯이다. Phase 구간 전개, 예상 호출 수, 비용 계산, 결과 출력,
실행 전 가드다. 앞 셋은 실행 전에 사용자가 보는 유일한 수이므로 값이 틀리면
예산 판단이 틀린다. 결과 출력은 결과 모델의 필드·property·메서드를 그대로
읽으므로 이름이 어긋나면 실행이 끝난 뒤에 `AttributeError` 로 무너진다. 실행 전
가드는 대역 실행과 뒤처진 스키마가 저장소에 닿기 전에 멈추는지를 본다.
"""

from __future__ import annotations

import importlib.util
import sys
from contextlib import contextmanager
from pathlib import Path
from types import ModuleType
from typing import Any

import pytest

from careersignal.agents.statistics.agent import ExtractionOutcome
from careersignal.contracts.check_result import (
    CheckName,
    CheckResult,
    CheckVerdict,
    Severity,
)
from careersignal.contracts.run_context import StopReason
from careersignal.graph.ontology import GraphBuildOutcome, GraphLayer
from careersignal.graph.paths import PathCacheOutcome
from careersignal.graph.semantic import NO_ONTOLOGY
from careersignal.graph.traversal import TraversalCut
from careersignal.providers.concurrency import default_workers
from careersignal.taxonomy.assignment import AssignmentOutcome
from careersignal.taxonomy.discovery import (
    NO_ACTIVE_TAXONOMY,
    TAXONOMY_MISMATCH,
    DiscoveryOutcome,
    candidate_identifier,
)
from careersignal.taxonomy.publication import PublicationOutcome
from careersignal.taxonomy.vocabulary import normalize_expression

SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "stage_d.py"

TAXONOMY_ID = "tx_backend"


def _load() -> ModuleType:
    """스크립트를 모듈로 불러온다.

    `pyproject.toml` 을 고치지 않는다. `scripts/` 를 테스트 경로에 넣으면 다른
    스크립트도 함께 수집되고, 그 스크립트들은 실행되면 저장소에 붙는다.
    """
    spec = importlib.util.spec_from_file_location("stage_d", SCRIPT)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


stage_d = _load()


def _mention(mention_id: str, expression: str) -> dict[str, Any]:
    return {"mention_id": mention_id, "raw_expression": expression}


def _never_known(_: str) -> bool:
    return False


# ================================================================ Phase 구간
def test_기본_구간은_8부터_12까지다() -> None:
    assert stage_d.phase_range(8, 12) == (8, 9, 10, 11, 12)


def test_일부_구간만_전개한다() -> None:
    assert stage_d.phase_range(10, 11) == (10, 11)


def test_한_단계만_돌릴_수_있다() -> None:
    assert stage_d.phase_range(9, 9) == (9,)


def test_시작이_끝보다_크면_거부한다() -> None:
    with pytest.raises(ValueError):
        stage_d.phase_range(11, 10)


def test_범위_밖의_Phase_를_거부한다() -> None:
    with pytest.raises(ValueError):
        stage_d.phase_range(7, 12)
    with pytest.raises(ValueError):
        stage_d.phase_range(8, 13)


# ================================================================ Phase 별 모델
def test_모델은_작업_등급표에서_가져온다() -> None:
    """`TASK_TIER` 와 `OPENAI_CHAT_MODELS` 밖에 모델 식별자를 두지 않는다."""
    assert stage_d.phase_model(8) == stage_d.chat_model(stage_d.EXTRACTION_TASK)
    assert stage_d.phase_model(9) == stage_d.chat_model(stage_d.JUDGEMENT_TASK)
    assert stage_d.phase_model(11) == stage_d.chat_model(stage_d.ASSIGNMENT_TASK)


def test_모델을_부르지_않는_Phase_는_식별자가_없다() -> None:
    assert stage_d.phase_model(10) is None
    assert stage_d.phase_model(12) is None


def test_대역을_쓰면_어느_Phase_도_모델을_부르지_않는다() -> None:
    assert all(stage_d.phase_model(phase, stub=True) is None for phase in stage_d.PHASES)


# ================================================================ 임베딩 요청
def test_보낼_문자열이_없으면_요청도_없다() -> None:
    assert stage_d.embedding_requests(0) == 0
    assert stage_d.embedding_requests(-5) == 0


def test_묶음_크기로_올림해_요청_수를_센다() -> None:
    assert stage_d.embedding_requests(64, batch_size=64) == 1
    assert stage_d.embedding_requests(65, batch_size=64) == 2
    assert stage_d.embedding_requests(129, batch_size=64) == 3


def test_묶음_크기가_0_이하면_거부한다() -> None:
    with pytest.raises(ValueError):
        stage_d.embedding_requests(10, batch_size=0)


# ================================================================ Phase 9 호출
def test_같은_표기는_후보_하나로_묶여_판정을_한_번만_부른다() -> None:
    rows = [
        _mention("mention_1", "Kafka"),
        _mention("mention_2", "kafka"),
        _mention("mention_3", "Redis"),
    ]
    residual, judged, reused = stage_d.discovery_call_count(
        rows, set(), _never_known, TAXONOMY_ID, set()
    )
    assert residual == 3
    assert judged == 2
    assert reused == 0


def test_이미_후보에_붙은_표현은_세지_않는다() -> None:
    rows = [_mention("mention_1", "Kafka"), _mention("mention_2", "Redis")]
    assert stage_d.discovery_call_count(
        rows, {"mention_1"}, _never_known, TAXONOMY_ID, set()
    ) == (1, 1, 0)


def test_기지_어휘가_설명하는_표현은_판정을_부르지_않는다() -> None:
    rows = [_mention("mention_1", "Kafka"), _mention("mention_2", "Redis")]
    known = {"Kafka"}.__contains__
    assert stage_d.discovery_call_count(
        rows, set(), known, TAXONOMY_ID, set()
    ) == (1, 1, 0)


def test_매칭_키가_비는_표현은_후보가_되지_않는다() -> None:
    rows = [_mention("mention_1", "!!!"), _mention("mention_2", "Redis")]
    assert stage_d.discovery_call_count(
        rows, set(), _never_known, TAXONOMY_ID, set()
    ) == (1, 1, 0)


def test_이미_있는_후보에는_근거만_더하므로_판정을_다시_부르지_않는다() -> None:
    existing = {candidate_identifier(TAXONOMY_ID, normalize_expression("Kafka"))}
    rows = [_mention("mention_1", "Kafka"), _mention("mention_2", "Redis")]
    assert stage_d.discovery_call_count(
        rows, set(), _never_known, TAXONOMY_ID, existing
    ) == (2, 1, 1)


# ================================================================ Phase 11 호출
def test_이미_할당한_표현은_대상에서_뺀다() -> None:
    rows = [_mention("mention_1", "Kafka"), _mention("mention_2", "Redis")]
    assert stage_d.assignment_call_count(rows, {"mention_1"}, _never_known) == (1, 0)


def test_별칭_일치로_끝나는_표현을_따로_센다() -> None:
    rows = [
        _mention("mention_1", "Kafka"),
        _mention("mention_2", "Redis"),
        _mention("mention_3", "gRPC"),
    ]
    known = {"Kafka", "gRPC"}.__contains__
    assert stage_d.assignment_call_count(rows, set(), known) == (3, 2)


# ================================================================ 모델별 합계
def test_같은_모델의_호출을_합친다() -> None:
    estimates = (
        stage_d.PhaseEstimate(phase=8, chat_model="m_standard", chat_calls=100),
        stage_d.PhaseEstimate(phase=9, chat_model="m_standard", chat_calls=30),
        stage_d.PhaseEstimate(phase=11, chat_model="m_light", chat_calls=7),
    )
    assert stage_d.calls_by_model(estimates) == {"m_standard": 130, "m_light": 7}


def test_호출이_없는_단계는_모델별_합계에_담지_않는다() -> None:
    estimates = (
        stage_d.PhaseEstimate(phase=10),
        stage_d.PhaseEstimate(phase=12, chat_model="m_light", chat_calls=0),
    )
    assert stage_d.calls_by_model(estimates) == {}


# ================================================================ 비용
def test_단가가_없으면_금액을_계산하지_않고_항목_이름을_돌려준다() -> None:
    amount, unpriced = stage_d.estimate_cost({"m_standard": 100}, 0, prices={})
    assert amount == 0.0
    assert unpriced == ("m_standard",)


def test_단가가_0_이면_단가_미설정으로_본다() -> None:
    amount, unpriced = stage_d.estimate_cost(
        {"m_standard": 100}, 0, prices={"m_standard": 0.0}
    )
    assert amount == 0.0
    assert unpriced == ("m_standard",)


def test_단가가_있으면_호출_수를_곱한다() -> None:
    amount, unpriced = stage_d.estimate_cost(
        {"m_standard": 100, "m_light": 10},
        embedding_calls=4,
        prices={"m_standard": 0.02, "m_light": 0.001},
        embedding_price=0.0001,
    )
    assert unpriced == ()
    assert amount == pytest.approx(100 * 0.02 + 10 * 0.001 + 4 * 0.0001)


def test_임베딩만_단가가_없으면_임베딩만_남는다() -> None:
    amount, unpriced = stage_d.estimate_cost(
        {"m_standard": 10},
        embedding_calls=3,
        prices={"m_standard": 0.5},
        embedding_price=0.0,
    )
    assert amount == pytest.approx(5.0)
    assert unpriced == ("임베딩",)


def test_기본_단가는_전부_0_이라_금액이_나오지_않는다() -> None:
    """`CHAT_PRICE_PER_CALL` 의 기본값은 확인 전이므로 금액을 만들지 않는다."""
    amount, unpriced = stage_d.estimate_cost({"gpt-5.6-terra": 3268}, 2)
    assert amount == 0.0
    assert unpriced == ("gpt-5.6-terra", "임베딩")


# ================================================================ 예상 작업량
def _workload() -> Any:
    return stage_d.Workload(
        taxonomy_version_id="tx_backend_v1",
        vocabulary_size=40,
        chunks=3268,
        mentions=12000,
        residual=5000,
        judgements=1800,
        reused_candidates=120,
        candidates=1800,
        assignable=12000,
        alias_hits=9000,
    )


def test_별칭으로_끝나지_않는_표현만_사슬_뒤로_흐른다() -> None:
    assert _workload().assignment_residual() == 3000


def test_할당_대상보다_별칭_일치가_많아도_음수가_되지_않는다() -> None:
    workload = stage_d.Workload(assignable=5, alias_hits=9)
    assert workload.assignment_residual() == 0


def test_Phase_8_은_청크마다_한_번_부른다() -> None:
    (estimate,) = stage_d.build_estimates((8,), _workload())
    assert estimate.targets == 3268
    assert estimate.chat_calls == 3268
    assert estimate.chat_model == stage_d.chat_model(stage_d.EXTRACTION_TASK)


def test_Phase_9_는_새_후보_수만큼_부른다() -> None:
    (estimate,) = stage_d.build_estimates((9,), _workload())
    assert estimate.targets == 12000
    assert estimate.chat_calls == 1800


def test_Phase_9_의_호출_수는_재판정을_포함한다() -> None:
    """재판정도 모델 호출 하나다. 빼면 예산이 재판정을 담지 못한다."""
    workload = stage_d.Workload(judgements=12, rejudgements=868)
    (estimate,) = stage_d.build_estimates((9,), workload)
    assert estimate.chat_calls == 880


def test_잔여_표현이_없어도_재판정_예산이_남는다() -> None:
    """실행 로그의 갈래다. 잔여 0·재판정 868 에서 예산이 0 이면 아무것도 못 한다."""
    workload = stage_d.Workload(judgements=0, rejudgements=868)
    assert workload.discovery_calls() == 868


def test_Phase_9_의_예상_호출_수와_예산이_같은_계산에서_나온다() -> None:
    """두 자리에서 따로 더하면 한쪽만 고쳐졌을 때 값이 갈린다."""
    workload = stage_d.Workload(judgements=45, rejudgements=868)
    (estimate,) = stage_d.build_estimates((9,), workload)
    assert estimate.chat_calls == workload.discovery_calls()

    session = stage_d.Session(
        manifest=None,
        job_role_id="backend",
        limit=None,
        stub=True,
        analysis_version=None,
        workload=workload,
    )
    assert session.workload.discovery_calls() == estimate.chat_calls


def test_Phase_9_가_실행_봉투에_넘기는_예산이_재판정을_담는다(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """실행 로그의 결함이다. 예산이 판정 수만 담으면 재판정이 한 건도 돌지 않는다."""
    workload = stage_d.Workload(judgements=0, rejudgements=868)
    session = stage_d.Session(
        manifest=None,
        job_role_id="backend",
        limit=None,
        stub=True,
        analysis_version=None,
        workload=workload,
    )
    budgets: list[int] = []

    def _context(step: str, calls: int, taxonomy_version_id: str | None = None) -> Any:
        budgets.append(calls)
        return object()

    monkeypatch.setattr(session, "refresh", lambda: None)
    monkeypatch.setattr(session, "context", _context)
    monkeypatch.setattr(stage_d, "unit_of_work", _null_unit_of_work)
    monkeypatch.setattr(stage_d, "StatisticsRepository", lambda unit: object())
    monkeypatch.setattr(
        stage_d, "CandidateDiscovery", lambda *a, **k: _DiscoveryDouble()
    )
    monkeypatch.setattr(stage_d, "report_discovery", lambda outcome: None)

    stage_d.run_phase_9(session)
    assert budgets == [868]


@contextmanager
def _null_unit_of_work(component: Any) -> Any:
    """저장소에 붙지 않는 거래 대역."""
    yield object()


class _DiscoveryDouble:
    """모델도 저장소도 부르지 않는 발견 대역."""

    def run(self, context: Any, limit: int | None = None) -> Any:
        return DiscoveryOutcome(
            agent_run_id="run_stage_d_test",
            stop_reason=StopReason.BUDGET_EXHAUSTED,
            pending_rejudgements=800,
        )


def test_예산이_모자란_Phase_9_는_남은_대상을_요약에_적는다() -> None:
    """`budget_exhausted` 자체는 정상이다. 무엇이 얼마나 남았는지가 보여야 한다."""
    outcome = DiscoveryOutcome(
        agent_run_id="run_stage_d_test",
        stop_reason=StopReason.BUDGET_EXHAUSTED,
        pending_groups=12,
        pending_rejudgements=856,
    )
    line = stage_d._discovery_incomplete(outcome)
    assert "12" in line
    assert "856" in line


def test_다_끝낸_Phase_9_는_남은_대상을_적지_않는다() -> None:
    outcome = DiscoveryOutcome(
        agent_run_id="run_stage_d_test",
        stop_reason=StopReason.FRONTIER_EXHAUSTED,
    )
    assert stage_d._discovery_incomplete(outcome) == ""


def test_Phase_10_과_12_는_모델을_부르지_않는다() -> None:
    for phase in (10, 12):
        (estimate,) = stage_d.build_estimates((phase,), _workload())
        assert estimate.chat_model is None
        assert estimate.chat_calls == 0
        assert estimate.embedding_calls == 0


def test_Phase_11_은_차원_라벨과_잔여_표현을_함께_임베딩한다() -> None:
    (estimate,) = stage_d.build_estimates((11,), _workload())
    assert estimate.chat_calls == 3000
    assert estimate.upper_bound is True
    assert estimate.embedded_texts == 40 + 3000
    assert estimate.embedding_calls == stage_d.embedding_requests(3040)


def test_잔여가_없으면_차원_라벨도_임베딩하지_않는다() -> None:
    workload = stage_d.Workload(vocabulary_size=40, assignable=10, alias_hits=10)
    (estimate,) = stage_d.build_estimates((11,), workload)
    assert estimate.embedded_texts == 0
    assert estimate.embedding_calls == 0


def test_대역을_쓰면_외부_호출이_0_이다() -> None:
    estimates = stage_d.build_estimates(stage_d.PHASES, _workload(), stub=True)
    assert stage_d.calls_by_model(estimates) == {}
    assert sum(estimate.embedding_calls for estimate in estimates) == 0
    assert [estimate.targets for estimate in estimates] == [
        3268,
        12000,
        1800,
        12000,
        0,
    ]


def test_고른_구간의_Phase_만_추정한다() -> None:
    estimates = stage_d.build_estimates((10, 11), _workload())
    assert [estimate.phase for estimate in estimates] == [10, 11]


# ================================================================ 실행 순서
def test_Phase_마다_실행_함수가_하나씩_있다() -> None:
    assert tuple(sorted(stage_d.RUNNERS)) == stage_d.PHASES


def test_Phase_마다_실행_행의_이름이_다르다() -> None:
    names = tuple(stage_d.AGENT_NAME.values())
    assert len(set(names)) == len(names)


# ================================================================ 결과 출력
"""`report_*` 를 결과 모델로 실제로 불러 본다.

출력 함수는 결과 모델의 이름을 문자열 안에서 읽는다. 필드를 property 로 바꾸거나
property 를 메서드로 바꾸면 호출 자리만 어긋나고 타입 검사도 테스트도 지나간다.
`PathCacheOutcome.cut_counts` 가 메서드인데 괄호 없이 쓰여 Phase 12-3 출력에서
`AttributeError` 가 났던 것이 그 예다. 여기서는 모델을 만들어 함수를 부르고,
예외가 없는지와 메서드 객체가 그대로 찍히지 않았는지를 함께 본다.
"""

BOUND = ("<bound method", "<built-in method", "<function")
"""괄호를 빠뜨린 흔적. 이 문자열이 출력에 있으면 값 대신 객체를 찍은 것이다."""


def _no_object_repr(text: str) -> None:
    for mark in BOUND:
        assert mark not in text, f"출력에 {mark} 가 있다. 괄호를 빠뜨렸다"


def test_Phase_8_출력이_추출_결과_모델을_읽는다(capsys: Any) -> None:
    outcome = ExtractionOutcome(
        agent_run_id="run_1",
        stop_reason=StopReason.SLOTS_FILLED,
        visited_chunks=10,
        skipped_chunks=2,
        created_mentions=30,
        discarded=(("chunk_1", "Kafka", "자리를 찾지 못했다"),),
        errors=(("chunk_2", "모델이 실패했다"),),
    )
    stage_d.report_extraction(outcome)
    captured = capsys.readouterr().out
    _no_object_repr(captured)
    assert "새 mention   30개" in captured


def test_Phase_9_출력이_발견_결과_모델을_읽는다(capsys: Any) -> None:
    outcome = DiscoveryOutcome(
        agent_run_id="run_1",
        stop_reason=StopReason.SLOTS_FILLED,
        taxonomy_version_id="tx_backend_v1",
        vocabulary_size=40,
        visited_mentions=100,
        skipped_mentions=5,
        known_mentions=60,
        residual_mentions=35,
        created_candidates=12,
        reused_candidates=3,
        judged=12,
        relations={"synonym": 4, "none": 8},
        errors=(("cand_1", "판정이 실패했다"),),
    )
    stage_d.report_discovery(outcome)
    captured = capsys.readouterr().out
    _no_object_repr(captured)
    assert "새 후보      12개" in captured


def test_Phase_10_출력이_발행한_버전을_읽는다(capsys: Any) -> None:
    outcome = PublicationOutcome(
        agent_run_id="run_1",
        stop_reason=StopReason.SLOTS_FILLED,
        taxonomy_id="tax_backend",
        previous_taxonomy_version_id="tx_backend_v1",
        taxonomy_version_id="tx_backend_v2",
        version_number=2,
        reviewed=20,
        promoted=7,
        merged=1,
        held=2,
        rejected=10,
        carried_dimensions=40,
        created_dimensions=7,
        created_aliases=9,
        created_relations=3,
        recorded_decisions=7,
        errors=(("cand_1", "심사가 실패했다"),),
    )
    stage_d.report_publication(outcome)
    captured = capsys.readouterr().out
    _no_object_repr(captured)
    assert "tx_backend_v2" in captured
    assert "활성 차원    47개" in captured


def test_Phase_10_출력이_발행하지_않은_실행도_읽는다(capsys: Any) -> None:
    outcome = PublicationOutcome(
        agent_run_id="run_1",
        stop_reason=StopReason.NO_NEW_EVIDENCE,
        reviewed=3,
    )
    stage_d.report_publication(outcome)
    captured = capsys.readouterr().out
    _no_object_repr(captured)
    assert "발행 버전    없음" in captured


def test_Phase_11_출력이_할당_결과_모델을_읽는다(capsys: Any) -> None:
    outcome = AssignmentOutcome(
        agent_run_id="run_1",
        stop_reason=StopReason.SLOTS_FILLED,
        taxonomy_version_id="tx_backend_v2",
        full_reassignment=True,
        vocabulary_size=47,
        visited_mentions=100,
        skipped_mentions=10,
        assigned_mentions=80,
        by_method={"alias_exact": 60, "model_judgment": 20},
        embedded_expressions=20,
        judged=20,
        unassigned=(("mention_1", "붙일 차원이 없다"),),
        errors=(("mention_2", "판정이 실패했다"),),
    )
    stage_d.report_assignment(outcome)
    captured = capsys.readouterr().out
    _no_object_repr(captured)
    assert "할당         80개" in captured


def test_Phase_11_출력이_같은_사유를_묶어_센다(capsys: Any) -> None:
    """같은 한 줄이 수백 번 반복되면 다른 사유가 묻힌다."""
    outcome = AssignmentOutcome(
        agent_run_id="run_1",
        stop_reason=StopReason.EXPLICIT_FAILURE,
        taxonomy_version_id="tx_backend_v2",
        assigned_mentions=245,
        errors=tuple(
            (f"mention_{index}", "RateLimitError: insufficient_quota")
            for index in range(198)
        ),
    )
    stage_d.report_assignment(outcome)
    captured = capsys.readouterr().out
    _no_object_repr(captured)
    assert "198건  RateLimitError: insufficient_quota" in captured
    assert captured.count("RateLimitError") == 1


def test_Phase_11_출력이_못_쓴_방법과_멈춘_사유를_따로_읽는다(capsys: Any) -> None:
    """방법이 통째로 빠진 것과 표현 하나가 실패한 것을 나눠 적는다."""
    outcome = AssignmentOutcome(
        agent_run_id="run_1",
        stop_reason=StopReason.EXPLICIT_FAILURE,
        taxonomy_version_id="tx_backend_v2",
        assigned_mentions=55,
        unavailable_methods=(("vector_match", "RateLimitError: insufficient_quota"),),
        halted_reason="RateLimitError: insufficient_quota",
        halted_pending=602,
    )
    stage_d.report_assignment(outcome)
    captured = capsys.readouterr().out
    _no_object_repr(captured)
    assert "못 쓴 방법" in captured
    assert "vector_match" in captured
    assert "남긴 표현    602개" in captured


def test_Phase_12_층_출력이_구축_결과_모델을_읽는다(capsys: Any) -> None:
    outcome = GraphBuildOutcome(
        agent_run_id="run_1",
        stop_reason=StopReason.SLOTS_FILLED,
        graph_layer=GraphLayer.SEMANTIC,
        ontology_version="onto_v1",
        taxonomy_version_id="tx_backend_v2",
        created_nodes={"RequirementDimension": 7, "Technology": 5},
        reused_nodes={"JobRole": 1},
        created_edges={"REQUIRES": 19},
        reused_edges={"ASSIGNED_TO": 2},
        discarded=(
            CheckResult(
                check=CheckName.SCHEMA,
                target_type="knowledge_edge",
                target_id="edge_1",
                verdict=CheckVerdict.FAIL,
                severity=Severity.BLOCKING,
                reason_code="ONTOLOGY_EDGE_TYPE_NOT_REGISTERED",
            ),
        ),
        skipped_types=(("Capability", "원천이 비어 있다"),),
        errors=(("onto_v1", "구축 전제가 깨졌다"),),
    )
    stage_d.report_graph("Phase 12-1  의미 층", outcome)
    captured = capsys.readouterr().out
    _no_object_repr(captured)
    assert "노드 생성    12개" in captured
    assert "엣지 생성    19개" in captured
    assert "폐기         1건" in captured


def test_Phase_12_경로_출력이_가지치기를_센다(capsys: Any) -> None:
    """`cut_counts` 는 property 가 아니라 메서드다.

    계약은 `src/careersignal/graph/paths.py` 쪽이고 `tests/unit/test_graph_traversal.py`
    가 메서드로 부른다. 출력이 괄호를 빠뜨리면 이 검사에서 걸린다.
    """
    outcome = PathCacheOutcome(
        agent_run_id="run_1",
        stop_reason=StopReason.SLOTS_FILLED,
        graph_policy_version="gp_v1",
        ontology_version="onto_v1",
        hits={"requirement_to_capability": 12},
        misses={"posting_to_dimension": 30},
        visited={"posting_to_dimension": 400},
        cuts=(
            TraversalCut(reason_code="CYCLE"),
            TraversalCut(reason_code="CYCLE"),
            TraversalCut(reason_code="DEPTH_LIMIT"),
        ),
        invalidated=4,
        skipped_types=(("capability_to_track", "사슬을 완성하는 경로가 없다"),),
        errors=(("onto_v1", "온톨로지가 없다"),),
    )
    stage_d.report_paths(outcome)
    captured = capsys.readouterr().out
    _no_object_repr(captured)
    assert "가지치기     CYCLE 2  DEPTH_LIMIT 1" in captured
    assert "캐시 적중    12개" in captured


def test_예상_호출_출력이_추정_모델을_읽는다(capsys: Any) -> None:
    estimates = stage_d.build_estimates(stage_d.PHASES, _workload())
    chat_calls, embedding_calls = stage_d.report_estimate(
        estimates, stub=False, offline=False
    )
    captured = capsys.readouterr().out
    _no_object_repr(captured)
    assert chat_calls > 0
    assert embedding_calls > 0


# ================================================================ 대역 가드
def test_대역만_주면_거부한다() -> None:
    assert stage_d.stub_needs_permission(stub=True, stub_write=False, dry_run=False)


def test_대역과_쓰기_허용을_함께_주면_진행한다() -> None:
    assert not stage_d.stub_needs_permission(
        stub=True, stub_write=True, dry_run=False
    )


def test_대역과_세기만_하기를_함께_주면_진행한다() -> None:
    """`--dry-run` 은 저장소를 읽기만 하므로 대역이 오염을 만들지 않는다."""
    assert not stage_d.stub_needs_permission(
        stub=True, stub_write=False, dry_run=True
    )


def test_대역이_아니면_가드가_걸리지_않는다() -> None:
    assert not stage_d.stub_needs_permission(
        stub=False, stub_write=False, dry_run=False
    )


def test_대역_안내가_두_갈래를_모두_적는다() -> None:
    assert "--dry-run" in stage_d.STUB_REFUSAL
    assert "--stub --stub-write" in stage_d.STUB_REFUSAL


def test_되돌리는_명령을_배너가_안내한다() -> None:
    assert "reset_stage_d.py" in stage_d.RESET_COMMAND
    assert "--execute" in stage_d.RESET_COMMAND


def test_대역_단독_실행은_저장소에_붙기_전에_멈춘다(capsys: Any) -> None:
    """거부는 인자 판정만으로 끝난다. `SUPABASE_DB_URL` 이 없어도 같은 결과다."""
    assert stage_d.main(["--stub", "--yes"]) == stage_d.EXIT_ABORTED
    captured = capsys.readouterr().out
    assert "--stub-write" in captured


def test_쓰기_허용만_주면_인자_오류다(capsys: Any) -> None:
    assert stage_d.main(["--stub-write"]) == stage_d.EXIT_ABORTED
    assert "--stub 과 함께" in capsys.readouterr().out


# ================================================================ 스키마 확인
def _write_revision(
    directory: Path, revision: str, down_revision: str | None
) -> None:
    parent = "None" if down_revision is None else f'"{down_revision}"'
    directory.joinpath(f"{revision}.py").write_text(
        f'"""테스트용 리비전."""\n\nrevision = "{revision}"\ndown_revision = {parent}\n',
        encoding="utf-8",
    )


def test_아무도_앞_리비전으로_지목하지_않은_것이_head_다(tmp_path: Path) -> None:
    _write_revision(tmp_path, "0001_first", None)
    _write_revision(tmp_path, "0002_second", "0001_first")
    _write_revision(tmp_path, "0003_third", "0002_second")
    assert stage_d.migration_head(tmp_path) == "0003_third"


def test_파일_이름_순서가_아니라_선언을_따른다(tmp_path: Path) -> None:
    """이름은 사람이 붙이고 순서는 `down_revision` 이 정한다."""
    _write_revision(tmp_path, "0009_early", "0018_late")
    _write_revision(tmp_path, "0018_late", None)
    assert stage_d.migration_head(tmp_path) == "0009_early"


def test_사슬이_끊기면_head_를_정하지_않는다(tmp_path: Path) -> None:
    _write_revision(tmp_path, "0001_first", None)
    _write_revision(tmp_path, "0005_fifth", "0004_missing")
    with pytest.raises(ValueError):
        stage_d.migration_head(tmp_path)


def test_리비전이_없으면_head_를_정하지_않는다(tmp_path: Path) -> None:
    with pytest.raises(ValueError):
        stage_d.migration_head(tmp_path)


def test_적용된_리비전이_head_와_같아야_최신이다() -> None:
    assert stage_d.schema_is_current("0018_x", "0018_x")
    assert not stage_d.schema_is_current("0017_x", "0018_x")
    assert not stage_d.schema_is_current(None, "0018_x")


def test_head_를_읽지_못하면_사유를_돌려준다(tmp_path: Path) -> None:
    """확인하지 못한 것을 확인했다고 보지 않는다. 저장소에 붙지 않는다."""
    problem = stage_d.schema_problem(tmp_path)
    assert problem is not None
    assert "--skip-schema-check" in problem


# ================================================================ 봉투 가드
ACTIVE_TAXONOMY = "tx_backend_v3"
"""저장소가 정한 활성 분류체계 버전. Phase 10 이 실행할 때마다 새 버전을 발행한다."""

SEEDED_TAXONOMY = "tx_backend_v1"
"""`0002_seed_reference.sql` 이 만든 첫 버전. 옛 선언을 흉내 내는 데만 쓴다."""


def test_활성_분류체계가_없으면_실행_전에_멈춘다(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """봉투가 선언할 버전이 없다. 한 단계도 돌리지 않는다."""
    monkeypatch.setattr(stage_d, "active_taxonomy_version_id", lambda job: None)

    problem = stage_d.envelope_problem("backend", None)

    assert problem is not None
    assert stage_d.ENVELOPE_NO_TAXONOMY in problem


def test_선언한_분류체계가_활성_버전과_다르면_멈춘다(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """실행 로그의 결함이다. 갈린 채로 돌면 저장된 수치가 선언과 다른 근거를 갖는다."""
    monkeypatch.setattr(
        stage_d, "active_taxonomy_version_id", lambda job: ACTIVE_TAXONOMY
    )
    monkeypatch.setattr(
        stage_d,
        "declared_taxonomy_mismatch",
        lambda version, active: f"{version} 은 {SEEDED_TAXONOMY} 를 선언했다",
    )

    problem = stage_d.envelope_problem("backend", "an_old")

    assert problem is not None
    assert SEEDED_TAXONOMY in problem
    assert "--analysis-version" in problem


def test_선언과_활성_버전이_같으면_멈추지_않는다(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        stage_d, "active_taxonomy_version_id", lambda job: ACTIVE_TAXONOMY
    )
    monkeypatch.setattr(
        stage_d, "declared_taxonomy_mismatch", lambda version, active: None
    )

    assert stage_d.envelope_problem("backend", "an_current") is None


def _envelope_session() -> Any:
    """봉투만 검사하는 세션. 저장소에 붙지 않는다."""
    return stage_d.Session(
        manifest=stage_d.SourceManifest.load(stage_d.DEFAULT_MANIFEST),
        job_role_id="backend",
        limit=None,
        stub=True,
        analysis_version=None,
        workload=stage_d.Workload(),
    )


def test_봉투가_단계마다_활성_분류체계를_다시_읽는다(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """실행 도중 Phase 10 이 새 버전을 발행하면 그 뒤 단계는 새 버전을 선언한다.

    실행 앞에서 한 번 읽어 고정하면 Phase 11·12 가 실제로 쓰는 버전과 봉투의 선언이
    갈린다. 봉투는 자기가 선언한 버전으로만 계산했다고 말할 수 있어야 한다.
    """
    session = _envelope_session()
    published = [SEEDED_TAXONOMY, SEEDED_TAXONOMY, ACTIVE_TAXONOMY]
    seen: list[str] = []

    monkeypatch.setattr(
        stage_d, "active_taxonomy_version_id", lambda job: published.pop(0)
    )

    def _ensure(**kwargs: Any) -> Any:
        seen.append(kwargs["taxonomy_version_id"])
        return stage_d.Envelope(
            analysis_version=f"an_{kwargs['taxonomy_version_id']}",
            agent_run_id="run_x",
            created_version=True,
        )

    monkeypatch.setattr(stage_d, "ensure_envelope", _ensure)

    versions = [session.envelope(step).analysis_version for step in ("8", "10", "11")]

    assert seen == [SEEDED_TAXONOMY, SEEDED_TAXONOMY, ACTIVE_TAXONOMY]
    assert versions[0] == versions[1]
    assert versions[2] != versions[1]


def test_분석_버전이_갈리면_사용자에게_알린다(
    monkeypatch: pytest.MonkeyPatch, capsys: Any
) -> None:
    """한 실행의 산출물이 두 분석 버전에 나뉜 것을 조용히 넘기지 않는다."""
    session = _envelope_session()
    session.note_envelope("8", "an_a", SEEDED_TAXONOMY)

    session.note_envelope("11", "an_b", ACTIVE_TAXONOMY)

    out = capsys.readouterr().out
    assert "an_b" in out
    assert "Phase 11" in out


def test_봉투가_활성_버전과_어긋나면_실행이_시작되지_않는다(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """봉투가 거절하면 그 단계는 한 줄도 저장하지 못한다."""
    session = _envelope_session()
    monkeypatch.setattr(
        stage_d, "active_taxonomy_version_id", lambda job: SEEDED_TAXONOMY
    )

    def _ensure(**kwargs: Any) -> Any:
        raise ValueError("봉투에 넘긴 분류체계 버전이 활성 버전과 다르다")

    monkeypatch.setattr(stage_d, "ensure_envelope", _ensure)

    with pytest.raises(SystemExit):
        session.envelope("8")


def test_활성_분류체계가_없으면_봉투를_세우지_않는다(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = _envelope_session()
    monkeypatch.setattr(stage_d, "active_taxonomy_version_id", lambda job: None)

    with pytest.raises(SystemExit):
        session.envelope("8")


# ================================================================ 실패 갈래
def _session() -> Any:
    """결과 기록만 검사하는 세션. 저장소에 붙지 않는다."""
    return stage_d.Session(
        manifest=None,
        job_role_id="backend",
        limit=None,
        stub=True,
        analysis_version=None,
        workload=stage_d.Workload(),
    )


def test_전제_사유는_각_모듈의_상수와_같다() -> None:
    """문구가 어긋나면 전제 실패를 부분 실패로 읽는다."""
    assert NO_ACTIVE_TAXONOMY in stage_d.PRECONDITION_REASONS
    assert TAXONOMY_MISMATCH in stage_d.PRECONDITION_REASONS
    assert NO_ONTOLOGY in stage_d.PRECONDITION_REASONS


def test_실행_전제가_깨진_실패는_뒤_단계를_막는다() -> None:
    """활성 분류체계가 없으면 붙일 차원도 그래프의 재료도 없다."""
    assert stage_d.blocks_next_phases(
        StopReason.EXPLICIT_FAILURE, (("backend", NO_ACTIVE_TAXONOMY),)
    )


def test_일부_항목이_실패한_실행은_뒤_단계를_막지_않는다() -> None:
    """245개를 붙인 실행의 245개는 그대로 쓸 수 있는 근거다."""
    errors = tuple(
        (f"mention_{index}", "RateLimitError: insufficient_quota")
        for index in range(198)
    )
    assert not stage_d.blocks_next_phases(StopReason.EXPLICIT_FAILURE, errors)


def test_실패가_아닌_종료_사유는_막지_않는다() -> None:
    """예산 소진과 근거 없음은 지금까지의 산출물이 온전하다."""
    assert not stage_d.blocks_next_phases(StopReason.BUDGET_EXHAUSTED)
    assert not stage_d.blocks_next_phases(StopReason.NO_NEW_EVIDENCE)
    assert not stage_d.blocks_next_phases(StopReason.SLOTS_FILLED)


def test_부분_실패를_기록하면_계속_진행한다() -> None:
    session = _session()

    proceed = session.record(
        "11",
        StopReason.EXPLICIT_FAILURE,
        "할당 245개",
        (("mention_1", "RateLimitError: insufficient_quota"),),
    )

    assert proceed
    assert not session.results[0].blocking
    assert session.results[0].incomplete == "실패 1건"


def test_전제_실패를_기록하면_멈춘다() -> None:
    session = _session()

    proceed = session.record(
        "11",
        StopReason.EXPLICIT_FAILURE,
        "할당 0개",
        (("backend", NO_ACTIVE_TAXONOMY),),
    )

    assert not proceed
    assert session.results[0].blocking


def test_요약이_덜_끝난_것을_적는다(capsys: Any) -> None:
    """사용자가 요약만 보고 무엇을 다시 돌려야 하는지 알 수 있어야 한다."""
    session = _session()
    session.record(
        "11",
        StopReason.EXPLICIT_FAILURE,
        "할당 245개",
        (("mention_1", "RateLimitError: insufficient_quota"),),
        "표현 198개 실패 · 표현 602개 시도 못 함",
    )
    session.record("12-1", StopReason.SLOTS_FILLED, "노드 300개")

    stage_d.report_summary(session)
    captured = capsys.readouterr().out

    assert "일부" in captured
    assert "덜 끝난 것" in captured
    assert "표현 602개 시도 못 함" in captured
    assert "같은 명령을 다시 돌리면" in captured


def test_할당_결과의_덜_끝난_한_줄이_멈춘_사유를_담는다() -> None:
    outcome = AssignmentOutcome(
        agent_run_id="run_1",
        stop_reason=StopReason.EXPLICIT_FAILURE,
        assigned_mentions=55,
        errors=(("mention_1", "RateLimitError: insufficient_quota"),),
        unavailable_methods=(("vector_match", "RateLimitError: insufficient_quota"),),
        halted_reason="RateLimitError: insufficient_quota",
        halted_pending=602,
    )

    line = stage_d._assignment_incomplete(outcome)

    assert "표현 1개 실패" in line
    assert "표현 602개 시도 못 함" in line
    assert "vector_match 못 씀" in line


def test_다_끝난_할당은_덜_끝난_것이_없다() -> None:
    outcome = AssignmentOutcome(
        agent_run_id="run_1",
        stop_reason=StopReason.SLOTS_FILLED,
        assigned_mentions=245,
    )

    assert stage_d._assignment_incomplete(outcome) == ""


def test_종료_코드는_네_상태를_가른다() -> None:
    """전제 실패와 부분 실패의 다음 할 일이 다르므로 코드도 다르다."""
    codes = {
        stage_d.EXIT_OK,
        stage_d.EXIT_FAILED,
        stage_d.EXIT_ABORTED,
        stage_d.EXIT_INCOMPLETE,
    }

    assert len(codes) == 4
    assert stage_d.EXIT_OK == 0
    assert stage_d.EXIT_INCOMPLETE != 0


# ================================================================ 동시 호출
def test_동시_호출_수의_기본값은_공용_상수다() -> None:
    """기본값을 스크립트가 따로 정하지 않는다. 두 자리에 두면 갈라진다."""
    assert stage_d.parse_args([]).workers == default_workers()


def test_동시_호출_수를_인자로_올린다() -> None:
    assert stage_d.parse_args(["--workers", "12"]).workers == 12


def test_동시_호출_수가_1_미만이면_거부한다() -> None:
    """저장소를 열기 전에 거른다. 실행 중간에 터지면 앞 단계만 저장된 채로 끝난다."""
    assert stage_d.main(["--workers", "0"]) == stage_d.EXIT_ABORTED


def test_실행_머리말이_동시_호출_수를_찍는다(capsys: Any) -> None:
    stage_d.main(["--offline", "--workers", "3"])

    assert "동시 호출     3" in capsys.readouterr().out


def test_실행_값을_넘기지_않은_Session_은_하나씩_부른다() -> None:
    """기본값 1 이라 이 값을 모르는 자리가 실수로 겹쳐 부르지 않는다."""
    session = stage_d.Session(
        manifest=stage_d.SourceManifest.load(stage_d.DEFAULT_MANIFEST),
        job_role_id="backend",
        limit=None,
        stub=True,
        analysis_version=None,
        workload=stage_d.offline_workload(stage_d.parse_args(["--offline"])),
    )

    assert session.workers == 1
