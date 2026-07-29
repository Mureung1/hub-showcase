"""분석 버전 단계 전이.

상태와 허용 전이는 docs/architecture.md 8장이고, 값 집합과 전이 표는
`domain/versioning.py` 가 이미 갖고 있다. 이 모듈은 그 표를 다시 적지 않고
`can_transition`·`require_transition` 을 그대로 부른다. 전이 표가 두 곳에 있으면
한쪽만 고쳐졌을 때 오케스트레이터가 허용한 전이를 다른 판정이 막는다.

`taxonomy/lifecycle.py` 는 재사용하지 않는다. 그쪽은 요구 차원과 후보의 상태
(`proposed`→`active`, docs/erd.md 7.4)이고 여기는 분석 버전의 상태
(`draft`→`active`, docs/erd.md 11.1)다. 낱말이 겹칠 뿐 값 집합이 다르며 한 표로
묶으면 차원의 `merged` 를 분석 버전에 쓸 수 있게 된다.

여기서 더하는 것은 두 가지다. 하나는 성공 경로의 다음 단계를 이름으로 돌려주는
것이고, 다른 하나는 저장소에 상태를 쓰기 전에 저장된 현재 상태로 전이를
검사하는 것이다. 부르는 쪽이 아는 상태가 아니라 저장된 상태로 검사해야 두 실행이
같은 버전을 동시에 옮기려 할 때 뒤엣것이 막힌다.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from careersignal.domain.versioning import (
    AnalysisVersionStatus,
    can_transition,
    require_transition,
)

PIPELINE: tuple[AnalysisVersionStatus, ...] = (
    AnalysisVersionStatus.DRAFT,
    AnalysisVersionStatus.RUNNING,
    AnalysisVersionStatus.VALIDATING,
    AnalysisVersionStatus.GATED,
    AnalysisVersionStatus.ACTIVE,
)
"""docs/architecture.md 8장의 성공 경로. 건너뛰는 전이를 두지 않는다."""

FAILABLE: tuple[AnalysisVersionStatus, ...] = (
    AnalysisVersionStatus.RUNNING,
    AnalysisVersionStatus.VALIDATING,
    AnalysisVersionStatus.GATED,
)
"""`failed` 로 나갈 수 있는 상태.

`draft` 는 영향 범위만 등록한 상태라 실패할 실행이 없고, `active` 는 이미 공개된
버전이라 실패가 아니라 `superseded` 로 물러난다.
"""

SERVING_STATUS = AnalysisVersionStatus.ACTIVE
"""사용자 조회에 제공되는 상태. 이 상태의 버전만 화면이 읽는다."""


class StageStore(Protocol):
    """단계 전이가 저장소에 요구하는 것 둘.

    `set_status` 는 바꾼 행 수를 돌려준다. 0 이면 그 분석 버전이 없다는 뜻이므로
    조용히 넘기지 않는다. `OrchestratorRepository.set_status` 가 이 모양이다.
    """

    def current_status(self, analysis_version: str) -> str | None: ...

    def set_status(self, analysis_version: str, status: str) -> int: ...


@dataclass(frozen=True, slots=True)
class StageTransition:
    """전이 한 번의 기록."""

    analysis_version: str
    before: AnalysisVersionStatus
    after: AnalysisVersionStatus


def parse_status(value: str) -> AnalysisVersionStatus:
    """저장된 문자열을 상태로 옮긴다. 값 집합 밖이면 예외다."""
    try:
        return AnalysisVersionStatus(value)
    except ValueError as exc:
        raise ValueError(f"분석 버전 상태가 아니다: {value!r}") from exc


def next_stage(current: AnalysisVersionStatus) -> AnalysisVersionStatus | None:
    """성공 경로의 다음 단계. `active` 처럼 더 갈 곳이 없으면 비운다.

    실패 경로와 `superseded` 는 여기서 돌려주지 않는다. 둘은 다음 단계가 아니라
    판정의 결과이므로 `fail` 과 `supersede` 로 따로 부른다.
    """
    if current not in PIPELINE:
        return None
    index = PIPELINE.index(current)
    if index + 1 >= len(PIPELINE):
        return None
    return PIPELINE[index + 1]


def require_known_version(analysis_version: str, stored: str | None) -> str:
    if stored is None:
        raise ValueError(f"저장된 분석 버전이 없다: {analysis_version}")
    return stored


def transition(
    store: StageStore, analysis_version: str, target: AnalysisVersionStatus
) -> StageTransition:
    """저장된 현재 상태에서 목표 상태로 옮긴다.

    허용되지 않는 전이는 `ValueError` 다. 같은 상태로 다시 옮기는 것도 전이가
    아니므로 막는다. `running` 을 두 번 쓰면 `started_at` 을 남긴 첫 실행과 두 번째
    실행을 구분할 수 없다.
    """
    current = parse_status(
        require_known_version(analysis_version, store.current_status(analysis_version))
    )
    require_transition(current, target)
    changed = store.set_status(analysis_version, str(target))
    if changed == 0:
        raise ValueError(f"상태를 바꾸지 못했다: {analysis_version} → {target}")
    return StageTransition(
        analysis_version=analysis_version, before=current, after=target
    )


def advance(store: StageStore, analysis_version: str) -> StageTransition:
    """성공 경로로 한 단계 나아간다."""
    current = parse_status(
        require_known_version(analysis_version, store.current_status(analysis_version))
    )
    target = next_stage(current)
    if target is None:
        raise ValueError(f"{current} 에는 나아갈 다음 단계가 없다")
    return transition(store, analysis_version, target)


def fail(store: StageStore, analysis_version: str) -> StageTransition:
    """실행·검증·수용 평가의 실패를 상태로 남긴다."""
    return transition(store, analysis_version, AnalysisVersionStatus.FAILED)


def retry(store: StageStore, analysis_version: str) -> StageTransition:
    """실패한 버전을 다시 돌린다. `failed` 에서만 `running` 으로 돌아간다."""
    return transition(store, analysis_version, AnalysisVersionStatus.RUNNING)


def supersede(store: StageStore, analysis_version: str) -> StageTransition:
    """새 버전이 활성화되면 이전 활성 버전을 물린다."""
    return transition(store, analysis_version, AnalysisVersionStatus.SUPERSEDED)


def reachable(
    current: AnalysisVersionStatus, target: AnalysisVersionStatus
) -> bool:
    """한 걸음 전이가 허용되는가. `domain/versioning.py` 의 판정을 그대로 쓴다."""
    return can_transition(current, target)
