"""실행 봉투 부트스트랩 검증.

`requirement_mentions` 가 실행을 가리키고 실행이 분석 버전을 가리킨다. 이 사슬이
서지 않으면 요구 표현을 한 줄도 저장하지 못한다. 근거는 docs/erd.md 6.1과 12장이다.

저장소는 대역으로 대체하고 봉투의 판정만 검사한다.
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from careersignal.domain.versioning import AnalysisVersionStatus
from careersignal.orchestration.envelope import (
    METRIC_POLICY_VERSION,
    TAXONOMY_VERSION_ID,
    agent_run_identifier,
    analysis_version_identifier,
    ensure_analysis_version,
    start_agent_run,
)

JOB_ROLE = "backend"
DATASET = "ds_backend_2607"
AGENT = "statistics"


class FakeEnvelopeStore:
    """오케스트레이터 저장소와 계측 저장소의 대역."""

    def __init__(self) -> None:
        self.versions: dict[str, dict[str, Any]] = {}
        self.runs: dict[str, dict[str, Any]] = {}
        self.created_versions = 0
        self.started_runs = 0

    def find_analysis_version(self, analysis_version: str) -> str | None:
        return analysis_version if analysis_version in self.versions else None

    def create_analysis_version(self, values: dict[str, Any]) -> None:
        self.versions[values["analysis_version"]] = values
        self.created_versions += 1

    def find_agent_run(self, agent_run_id: str) -> str | None:
        return agent_run_id if agent_run_id in self.runs else None

    def start_run(
        self,
        agent_run_id: str,
        analysis_version: str,
        agent_name: str,
        iteration: int,
        objective_id: str | None = None,
        started_at: datetime | None = None,
    ) -> None:
        self.runs[agent_run_id] = {
            "agent_run_id": agent_run_id,
            "analysis_version": analysis_version,
            "agent_name": agent_name,
            "iteration": iteration,
            "objective_id": objective_id,
            "started_at": started_at,
        }
        self.started_runs += 1


def _ensure(store: FakeEnvelopeStore, **kw: Any) -> Any:
    base: dict[str, Any] = {"job_role_id": JOB_ROLE, "dataset_version": DATASET}
    return ensure_analysis_version(store, **(base | kw))


# ============================================================ 식별자
def test_the_same_inputs_make_the_same_analysis_version() -> None:
    first = analysis_version_identifier(
        JOB_ROLE, DATASET, TAXONOMY_VERSION_ID, "model_v1", "prompt_v1", "rp_v1",
        METRIC_POLICY_VERSION,
    )
    second = analysis_version_identifier(
        JOB_ROLE, DATASET, TAXONOMY_VERSION_ID, "model_v1", "prompt_v1", "rp_v1",
        METRIC_POLICY_VERSION,
    )

    assert first == second
    assert first.startswith("an_")


def test_a_different_dataset_makes_a_different_analysis_version() -> None:
    """데이터셋이 바뀌면 같은 정책이라도 다른 봉투다."""
    first = _ensure(FakeEnvelopeStore()).analysis_version
    second = _ensure(FakeEnvelopeStore(), dataset_version="ds_backend_2608").analysis_version

    assert first != second


def test_a_different_prompt_makes_a_different_analysis_version() -> None:
    first = _ensure(FakeEnvelopeStore()).analysis_version
    second = _ensure(FakeEnvelopeStore(), prompt_version="prompt_v2").analysis_version

    assert first != second


def test_the_same_run_inputs_make_the_same_run_identifier() -> None:
    first = agent_run_identifier("an_test", AGENT, 1)

    assert first == agent_run_identifier("an_test", AGENT, 1)
    assert first.startswith("run_")


def test_a_later_iteration_makes_a_different_run_identifier() -> None:
    """다시 도는 실행은 회차로 갈린다."""
    assert agent_run_identifier("an_test", AGENT, 1) != agent_run_identifier(
        "an_test", AGENT, 2
    )


# ============================================================ 분석 버전
def test_a_version_is_created_with_the_seeded_reference_values() -> None:
    store = FakeEnvelopeStore()

    ensured = _ensure(store)

    stored = store.versions[ensured.analysis_version]
    assert ensured.created is True
    assert stored["taxonomy_version_id"] == "tx_backend_v1"
    assert stored["metric_policy_version"] == "mp_v1_prevalence"
    assert stored["job_role_id"] == JOB_ROLE
    assert stored["dataset_version"] == DATASET


def test_a_bootstrapped_version_is_running() -> None:
    """아직 산출물을 만드는 중이므로 검증 이후 상태를 쓰지 않는다."""
    store = FakeEnvelopeStore()

    ensured = _ensure(store)

    stored = store.versions[ensured.analysis_version]
    assert stored["status"] == str(AnalysisVersionStatus.RUNNING)
    assert stored["started_at"] is not None


def test_the_scope_spec_is_serialized_json() -> None:
    store = FakeEnvelopeStore()

    ensured = _ensure(store)

    stored = store.versions[ensured.analysis_version]
    assert json.loads(stored["scope_spec"]) == {"scope_level": "overall"}


def test_an_existing_version_is_not_created_again() -> None:
    """봉투를 다시 만들면 이전 산출물이 어느 버전에 속하는지 갈린다."""
    store = FakeEnvelopeStore()
    first = _ensure(store)

    second = _ensure(store)

    assert second.analysis_version == first.analysis_version
    assert second.created is False
    assert store.created_versions == 1


# ============================================================ 실행 행
def test_a_run_points_at_the_analysis_version() -> None:
    store = FakeEnvelopeStore()
    ensured = _ensure(store)

    agent_run_id = start_agent_run(
        store, analysis_version=ensured.analysis_version, agent_name=AGENT
    )

    assert store.runs[agent_run_id]["analysis_version"] == ensured.analysis_version
    assert store.runs[agent_run_id]["agent_name"] == AGENT
    assert store.runs[agent_run_id]["iteration"] == 1


def test_starting_the_same_run_twice_adds_nothing() -> None:
    """계측 표는 append-only 라 같은 기본키를 두 번 넣지 못한다."""
    store = FakeEnvelopeStore()
    ensured = _ensure(store)
    first = start_agent_run(
        store, analysis_version=ensured.analysis_version, agent_name=AGENT
    )

    second = start_agent_run(
        store, analysis_version=ensured.analysis_version, agent_name=AGENT
    )

    assert second == first
    assert store.started_runs == 1


def test_a_second_iteration_opens_another_run() -> None:
    store = FakeEnvelopeStore()
    ensured = _ensure(store)
    start_agent_run(store, analysis_version=ensured.analysis_version, agent_name=AGENT)

    start_agent_run(
        store, analysis_version=ensured.analysis_version, agent_name=AGENT, iteration=2
    )

    assert store.started_runs == 2
    assert {r["analysis_version"] for r in store.runs.values()} == {
        ensured.analysis_version
    }
