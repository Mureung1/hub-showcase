"""실행 봉투 부트스트랩.

`requirement_mentions.extraction_run_id` 는 `agent_runs` 를 참조하고
`agent_runs.analysis_version` 은 `analysis_versions` 를 참조한다. 분석 버전과
실행 행이 없으면 요구 표현을 한 줄도 저장하지 못한다. 이 모듈은 그 두 행을
보장한다.

분석 버전은 오케스트레이터의 쓰기 범위이고 계측 표는 전 구성요소가 INSERT
한다. 근거는 docs/permission-matrix.md 3장과 3.1이다. 거래는
`unit_of_work(Component.ORCHESTRATOR)` 하나로 연다.

식별자는 결정적이다. 같은 버전 조합에 같은 `an_` 식별자가 나오고, 같은 실행
조합에 같은 `run_` 식별자가 나온다. 재실행이 봉투를 늘리지 않는다.

분류체계 버전은 상수가 아니라 저장소가 정한다. Phase 10 이 승격이 있을 때마다 새
버전을 발행하므로(docs/architecture.md 7장) 상수로 고정한 봉투는 발행 한 번 뒤부터
자기가 선언한 것과 다른 분류체계로 계산한 수치를 담는다. 봉투를 만드는 쪽이
`active_taxonomy_version_id` 로 활성 버전을 읽어 넘기고, 봉투는 같은 거래 안에서 그
값이 아직 활성인지 다시 본다.

활성 버전이 바뀌면 분석 버전 식별자도 바뀐다. 다른 분류체계로 계산한 결과는 다른
분석 버전이며(docs/architecture.md 8장) 그래야 옛 버전의 산출물이 새 계산에 덮이지
않고 남는다.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Protocol

from careersignal.domain.permissions import Component
from careersignal.domain.scope import ScopeLevel
from careersignal.domain.versioning import AnalysisVersionStatus
from careersignal.repositories.base import Unit, unit_of_work
from careersignal.repositories.telemetry import (
    OrchestratorRepository,
    TelemetryRepository,
)

METRIC_POLICY_VERSION = "mp_v1_prevalence"
"""지표 정책 v1. `0002_seed_reference.sql` 의 일곱 정책 가운데 공고 출현율의 정책이다.

분류체계 버전과 달리 상수로 둔다. 정책 표는 마이그레이션과 시드가 관리하며 어떤
Phase 도 실행 중에 새 세대를 발행하지 않는다(docs/erd.md 10.3). 새 세대를 넣는 것은
마이그레이션을 더하는 일이고, 그때 이 상수도 함께 고친다.

`analysis_versions.metric_policy_version` 은 실행 하나가 선 정책 세대를 가리키는 단일
값이고(docs/erd.md 11.1), family 별 임계값은 `statistics_facts` 의 행마다 그 family 의
정책 행을 가리킨다. 세대가 같으면 어느 family 의 행을 가리켜도 같은 세대를 뜻하므로
공고 출현율의 행을 세대의 대표로 쓴다.
"""

NO_ACTIVE_TAXONOMY = "활성 분류체계 버전이 없다"
"""발행된 분류체계 버전이 하나도 없다. 봉투가 선언할 버전이 없다."""

MODEL_VERSION = "model_v1"
PROMPT_VERSION = "prompt_v1"
RETRIEVAL_POLICY_VERSION = "rp_v1"
"""세 값은 참조 표가 없는 자유 문자열이다. 통합 테스트의 분석 버전 시드와 맞춘다."""

BOOTSTRAP_STATUS = AnalysisVersionStatus.RUNNING
"""산출물을 생성하는 중인 버전.

`draft` 는 영향 범위만 등록한 상태이고 `gated` 이후는 검증을 마친 상태다.
요구 표현 추출은 산출물을 만드는 단계이므로 `running` 이다. 정의는
docs/architecture.md 8장이다.
"""


class EnvelopeStore(Protocol):
    """봉투가 저장소에 요구하는 것 여섯.

    좁게 잡아 대역으로 검증할 수 있게 한다.
    """

    def active_taxonomy_version(self, job_role_id: str) -> str | None: ...

    def declared_taxonomy_version(self, analysis_version: str) -> str | None: ...

    def find_analysis_version(self, analysis_version: str) -> str | None: ...

    def create_analysis_version(self, values: dict[str, Any]) -> None: ...

    def find_agent_run(self, agent_run_id: str) -> str | None: ...

    def start_run(
        self,
        agent_run_id: str,
        analysis_version: str,
        agent_name: str,
        iteration: int,
        objective_id: str | None = None,
        started_at: datetime | None = None,
    ) -> None: ...


class OrchestratorStore:
    """오케스트레이터 거래 하나를 봉투가 쓰는 창구로 묶는다.

    쓰기는 `OrchestratorRepository` 와 `TelemetryRepository` 가 수행한다.
    조회 넷은 아직 두 저장소에 없어 이 어댑터가 `Unit` 으로 대신한다.
    저장소에 같은 조회가 생기면 이 어댑터를 지운다.

    활성 분류체계 버전 조회는 `Repository` 가 이미 갖고 있으므로
    (`repositories/base.py`) 그 조회를 그대로 부르고 식별자만 꺼낸다. 같은 조회를
    베껴 두면 한쪽만 고쳐졌을 때 봉투와 집계가 서로 다른 버전을 본다.
    """

    def __init__(self, unit: Unit) -> None:
        self._unit = unit
        self._versions = OrchestratorRepository(unit)
        self._runs = TelemetryRepository(unit)

    def active_taxonomy_version(self, job_role_id: str) -> str | None:
        """직무의 활성 분류체계 버전 식별자. 발행된 버전이 없으면 비운다."""
        active = self._versions.active_taxonomy_version(job_role_id)
        return None if active is None else str(active["taxonomy_version_id"])

    def declared_taxonomy_version(self, analysis_version: str) -> str | None:
        """저장된 분석 버전이 선언한 분류체계 버전. 그 버전이 없으면 비운다."""
        return self._unit.fetch_value(
            "SELECT taxonomy_version_id FROM analysis_versions"
            " WHERE analysis_version = %s",
            (analysis_version,),
        )

    def find_analysis_version(self, analysis_version: str) -> str | None:
        return self._unit.fetch_value(
            "SELECT analysis_version FROM analysis_versions WHERE analysis_version = %s",
            (analysis_version,),
        )

    def create_analysis_version(self, values: dict[str, Any]) -> None:
        self._versions.create_analysis_version(values)

    def find_agent_run(self, agent_run_id: str) -> str | None:
        return self._unit.fetch_value(
            "SELECT agent_run_id FROM agent_runs WHERE agent_run_id = %s",
            (agent_run_id,),
        )

    def start_run(
        self,
        agent_run_id: str,
        analysis_version: str,
        agent_name: str,
        iteration: int,
        objective_id: str | None = None,
        started_at: datetime | None = None,
    ) -> None:
        self._runs.start_run(
            agent_run_id=agent_run_id,
            analysis_version=analysis_version,
            agent_name=agent_name,
            iteration=iteration,
            objective_id=objective_id,
            started_at=started_at,
        )


@dataclass(frozen=True, slots=True)
class EnsuredVersion:
    """분석 버전 보장 한 번의 결과."""

    analysis_version: str
    created: bool


@dataclass(frozen=True, slots=True)
class Envelope:
    """추출이 참조할 실행 봉투."""

    analysis_version: str
    agent_run_id: str
    created_version: bool


def _digest(material: str) -> str:
    return hashlib.sha256(material.encode()).hexdigest()[:24]


def analysis_version_identifier(
    job_role_id: str,
    dataset_version: str,
    taxonomy_version_id: str,
    model_version: str,
    prompt_version: str,
    retrieval_policy_version: str,
    metric_policy_version: str,
) -> str:
    """같은 버전 조합은 같은 분석 버전이다.

    버전을 가르는 값만 재료로 쓴다. 시각을 넣으면 같은 입력이 실행마다 다른
    봉투를 만들어 재실행이 산출물을 갈라놓는다.
    """
    material = ":".join(
        (
            job_role_id,
            dataset_version,
            taxonomy_version_id,
            model_version,
            prompt_version,
            retrieval_policy_version,
            metric_policy_version,
        )
    )
    return f"an_{_digest(material)}"


def agent_run_identifier(
    analysis_version: str,
    agent_name: str,
    iteration: int,
    objective_id: str | None = None,
) -> str:
    """같은 봉투에서 같은 에이전트의 같은 회차는 같은 실행이다.

    다시 도는 실행은 `iteration` 이 다르므로 식별자가 갈린다.
    """
    material = f"{analysis_version}:{agent_name}:{iteration}:{objective_id or ''}"
    return f"run_{_digest(material)}"


def default_scope_spec() -> dict[str, Any]:
    """직무 전체 범위. `overall` 은 `scope_id` 를 갖지 않는다."""
    return {"scope_level": str(ScopeLevel.OVERALL)}


def taxonomy_mismatch(
    analysis_version: str, declared: str | None, active: str | None
) -> str | None:
    """선언한 분류체계 버전과 실행이 쓸 활성 버전이 어긋나면 사유를, 같으면 비운다.

    분석 버전은 `analysis_versions.taxonomy_version_id` 로 어느 분류체계를 썼는지
    선언하고(docs/erd.md 11.1) 집계와 검증은 저장소의 활성 버전으로 계산한다. 둘이
    갈리면 저장된 수치가 선언과 다른 분류체계에서 나오므로, 재계산하는 검증이 선언한
    버전에서 할당을 하나도 찾지 못해 전 행이 위반이 된다.

    선언한 버전이 없는 경우(`declared` 가 비어 있음)는 어긋남이 아니다. 아직 만들지
    않은 분석 버전이며 봉투가 활성 버전으로 선언하며 만든다.
    """
    if active is None:
        return f"{NO_ACTIVE_TAXONOMY}. {analysis_version} 이 쓸 분류체계를 정할 수 없다"
    if declared is None or declared == active:
        return None
    return (
        f"분석 버전 {analysis_version} 은 분류체계 {declared} 를 선언했는데"
        f" 활성 버전은 {active} 다."
        " 선언한 버전으로 재계산하는 검증이 할당을 찾지 못해 전 행이 위반이 된다"
    )


def active_taxonomy_version_id(
    job_role_id: str, conninfo: str | None = None
) -> str | None:
    """저장소가 정한 활성 분류체계 버전. 발행된 버전이 없으면 비운다.

    실행 스크립트가 봉투를 만들기 전에 부른다. 봉투가 선언할 버전을 상수로 두면 새
    버전이 발행된 뒤 선언과 계산이 갈린다.
    """
    with unit_of_work(Component.ORCHESTRATOR, conninfo) as unit:
        return OrchestratorStore(unit).active_taxonomy_version(job_role_id)


def declared_taxonomy_mismatch(
    analysis_version: str, active: str | None, conninfo: str | None = None
) -> str | None:
    """저장된 분석 버전의 선언이 활성 버전과 어긋나면 사유를, 같으면 비운다.

    `--analysis-version` 으로 옛 버전을 가리킨 실행을 시작 전에 멈춘다. 판정은
    `taxonomy_mismatch` 가 하고 이 함수는 선언 값을 읽어 오기만 한다.
    """
    with unit_of_work(Component.ORCHESTRATOR, conninfo) as unit:
        declared = OrchestratorStore(unit).declared_taxonomy_version(analysis_version)
    return taxonomy_mismatch(analysis_version, declared, active)


def ensure_analysis_version(
    store: EnvelopeStore,
    job_role_id: str,
    dataset_version: str,
    taxonomy_version_id: str,
    model_version: str = MODEL_VERSION,
    prompt_version: str = PROMPT_VERSION,
    retrieval_policy_version: str = RETRIEVAL_POLICY_VERSION,
    metric_policy_version: str = METRIC_POLICY_VERSION,
    scope_spec: dict[str, Any] | None = None,
    status: AnalysisVersionStatus = BOOTSTRAP_STATUS,
    started_at: datetime | None = None,
) -> EnsuredVersion:
    """분석 버전 행을 보장한다. 이미 있으면 만들지 않는다.

    `taxonomy_version_id` 에 기본값을 두지 않는다. 시드가 만든 첫 버전을 기본값으로
    두면 새 버전이 발행된 뒤에도 봉투가 옛 버전을 선언하고, 그 선언과 계산이 갈린
    것을 아무도 알아채지 못한다. 부르는 쪽이 활성 버전을 읽어 넘긴다.

    넘긴 버전이 활성 버전과 다르면 만들지 않고 `ValueError` 를 던진다. 조회와 생성이
    같은 거래 안에 있으므로 그 사이에 활성 버전이 바뀔 틈이 없다.

    `knowledge_version` 은 비운다. 지식 버전은 Phase 12 이후에 생기며 컬럼이
    NULL 을 허용한다.
    """
    active = store.active_taxonomy_version(job_role_id)
    if active is None:
        raise ValueError(f"{NO_ACTIVE_TAXONOMY}. 봉투가 선언할 버전이 없다")
    if active != taxonomy_version_id:
        raise ValueError(
            f"봉투에 넘긴 분류체계 버전 {taxonomy_version_id} 이"
            f" 활성 버전 {active} 과 다르다. 선언과 계산이 갈린다"
        )
    analysis_version = analysis_version_identifier(
        job_role_id=job_role_id,
        dataset_version=dataset_version,
        taxonomy_version_id=taxonomy_version_id,
        model_version=model_version,
        prompt_version=prompt_version,
        retrieval_policy_version=retrieval_policy_version,
        metric_policy_version=metric_policy_version,
    )
    if store.find_analysis_version(analysis_version) is not None:
        return EnsuredVersion(analysis_version, created=False)

    moment = started_at
    if moment is None and status is AnalysisVersionStatus.RUNNING:
        moment = datetime.now()
    store.create_analysis_version(
        {
            "analysis_version": analysis_version,
            "job_role_id": job_role_id,
            "dataset_version": dataset_version,
            "taxonomy_version_id": taxonomy_version_id,
            "model_version": model_version,
            "prompt_version": prompt_version,
            "retrieval_policy_version": retrieval_policy_version,
            "metric_policy_version": metric_policy_version,
            "scope_spec": json.dumps(
                scope_spec or default_scope_spec(), ensure_ascii=False
            ),
            "status": str(status),
            "started_at": moment,
        }
    )
    return EnsuredVersion(analysis_version, created=True)


def start_agent_run(
    store: EnvelopeStore,
    analysis_version: str,
    agent_name: str,
    iteration: int = 1,
    objective_id: str | None = None,
    started_at: datetime | None = None,
) -> str:
    """실행 행을 만들고 식별자를 돌려준다.

    계측 표는 전 구성요소가 INSERT 한다. 같은 조합으로 이미 열린 실행이 있으면
    새로 만들지 않는다. 계측은 append-only 라 같은 기본키를 두 번 넣지 못한다.
    """
    agent_run_id = agent_run_identifier(
        analysis_version=analysis_version,
        agent_name=agent_name,
        iteration=iteration,
        objective_id=objective_id,
    )
    if store.find_agent_run(agent_run_id) is not None:
        return agent_run_id
    store.start_run(
        agent_run_id=agent_run_id,
        analysis_version=analysis_version,
        agent_name=agent_name,
        iteration=iteration,
        objective_id=objective_id,
        started_at=started_at,
    )
    return agent_run_id


def ensure_envelope(
    job_role_id: str,
    dataset_version: str,
    agent_name: str,
    taxonomy_version_id: str,
    iteration: int = 1,
    objective_id: str | None = None,
    conninfo: str | None = None,
) -> Envelope:
    """오케스트레이터 거래 하나로 분석 버전과 실행 행을 함께 보장한다.

    거래가 하나이므로 분석 버전만 남고 실행 행이 빠지는 중간 상태가 없다.
    버전 조합을 바꾸려면 거래를 직접 열고 두 함수를 따로 부른다.

    `taxonomy_version_id` 는 부르는 쪽이 `active_taxonomy_version_id` 로 읽어 넘긴다.
    같은 거래 안에서 활성 버전과 다시 견주므로 읽은 뒤 새 버전이 발행되었으면
    `ValueError` 로 멈춘다.
    """
    with unit_of_work(Component.ORCHESTRATOR, conninfo) as unit:
        store = OrchestratorStore(unit)
        ensured = ensure_analysis_version(
            store,
            job_role_id=job_role_id,
            dataset_version=dataset_version,
            taxonomy_version_id=taxonomy_version_id,
        )
        agent_run_id = start_agent_run(
            store,
            analysis_version=ensured.analysis_version,
            agent_name=agent_name,
            iteration=iteration,
            objective_id=objective_id,
        )
    return Envelope(
        analysis_version=ensured.analysis_version,
        agent_run_id=agent_run_id,
        created_version=ensured.created,
    )
