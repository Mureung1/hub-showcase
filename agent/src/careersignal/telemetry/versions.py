"""모델·프롬프트 버전 고정.

Phase 24-3 이다. 각 실행은 입력 데이터 버전, 분류체계 버전, 모델·프롬프트·검색
정책·지표 정책 버전을 기록한다(docs/architecture.md 14.3). 앞의 둘은 분석 버전
식별자가 이미 담고 있으므로 이 모듈은 뒤의 넷을 한 객체로 묶는다.

넷은 분석 버전 식별자의 재료이기도 하다(`orchestration/envelope.py` 의
`analysis_version_identifier`). 실행 도중에 하나라도 바뀌면 앞의 산출물과 뒤의
산출물이 다른 조합에서 나온 것인데 같은 분석 버전에 담긴다. 그 버전을 재현하면
어느 쪽도 다시 나오지 않는다. 그래서 바뀌면 예외를 낸다.

기본값을 봉투 모듈에서 가져온다. 상수를 여기서 다시 적으면 한쪽만 고쳐졌을 때
분석 버전을 만든 값과 기록한 값이 갈린다.

저장소는 `Protocol` 로 주입한다. `psycopg` 를 import 하지 않는다.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Protocol

from pydantic import BaseModel, ConfigDict

from careersignal.orchestration.envelope import (
    METRIC_POLICY_VERSION,
    MODEL_VERSION,
    PROMPT_VERSION,
    RETRIEVAL_POLICY_VERSION,
    Envelope,
)

VERSION_DRIFT = "실행 중에 버전이 바뀌었다"
"""고정한 조합과 다른 조합으로 실행을 이어 가려 했다."""

UNPINNED_RUN = "버전을 고정하지 않은 실행이다"
"""고정하지 않은 실행의 버전을 확인하려 했다. 무엇으로 만든 산출물인지 알 수 없다."""


class VersionDriftError(RuntimeError):
    """고정한 버전과 다른 버전으로 실행을 이어 가려 했다.

    `ValueError` 가 아니다. 넘긴 값이 틀린 것이 아니라 실행 중에 세상이 바뀐 것이며
    부르는 쪽이 인자를 고쳐서 될 일이 아니다.
    """


class RunVersions(BaseModel):
    """실행 하나가 고정하는 버전 넷.

    분석 버전 식별자를 만드는 재료 가운데 직무·데이터셋·분류체계를 뺀 나머지다.
    앞의 셋은 무엇을 분석하는지이고 이 넷은 어떻게 분석하는지다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    model_version: str = MODEL_VERSION
    prompt_version: str = PROMPT_VERSION
    retrieval_policy_version: str = RETRIEVAL_POLICY_VERSION
    metric_policy_version: str = METRIC_POLICY_VERSION

    @classmethod
    def from_row(cls, row: Mapping[str, Any]) -> RunVersions:
        """`analysis_versions` 한 행에서 읽는다.

        저장된 버전과 실행이 쓰는 버전을 견주는 자리다. 행에 없는 열은 기본값으로
        떨어지지 않고 실패한다. 없는 열을 기본값으로 덮으면 어긋남을 못 본다.
        """
        missing = [name for name in cls.model_fields if name not in row]
        if missing:
            raise KeyError(f"분석 버전 행에 버전 열이 없다: {', '.join(missing)}")
        return cls(**{name: str(row[name]) for name in cls.model_fields})

    def as_dict(self) -> dict[str, str]:
        return self.model_dump()


class RunPin(BaseModel):
    """봉투 하나와 그 실행이 고정한 버전.

    봉투와 버전을 따로 두지 않는다. 어느 실행이 무엇으로 돌았는지는 둘이 함께
    있어야 답할 수 있다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    analysis_version: str
    agent_run_id: str
    versions: RunVersions

    def as_row(self) -> dict[str, str]:
        """기록할 한 줄. 봉투의 두 식별자와 버전 넷이다."""
        return {
            "analysis_version": self.analysis_version,
            "agent_run_id": self.agent_run_id,
            **self.versions.as_dict(),
        }


class VersionLog(Protocol):
    """고정한 버전을 남기는 쪽의 자리.

    표 하나에 묶지 않는다. 버전 넷은 `analysis_versions` 에 이미 있고, 이 기록은
    실행 단위로 같은 값을 다시 확인하는 궤적이다. 어디에 남길지는 부르는 쪽이 정한다.
    """

    def record_run_versions(self, values: dict[str, str]) -> None: ...


class VersionPinboard:
    """실행마다 버전을 한 번 고정하고 그 뒤로는 같은지만 본다.

    같은 실행을 같은 버전으로 다시 고정하는 것은 통과다. 재실행이 계측을 늘리지
    않는 것과 같은 이유이며, 다른 버전으로 고정하려는 것만 막는다.
    """

    def __init__(self, log: VersionLog | None = None) -> None:
        self._log = log
        self._pinned: dict[str, RunPin] = {}

    @property
    def pinned_runs(self) -> tuple[str, ...]:
        return tuple(sorted(self._pinned))

    def pin(
        self, envelope: Envelope, versions: RunVersions | None = None
    ) -> RunPin:
        """봉투 하나에 버전을 고정한다. 이미 다른 버전으로 고정했으면 예외다.

        기록은 처음 고정할 때 한 번만 한다. 같은 실행의 같은 조합을 두 번 남기면
        궤적이 실행 수와 맞지 않는다.
        """
        pin = RunPin(
            analysis_version=envelope.analysis_version,
            agent_run_id=envelope.agent_run_id,
            versions=versions or RunVersions(),
        )
        existing = self._pinned.get(pin.agent_run_id)
        if existing is not None:
            self._require_same(existing, pin)
            return existing

        self._pinned[pin.agent_run_id] = pin
        if self._log is not None:
            self._log.record_run_versions(pin.as_row())
        return pin

    def versions_of(self, agent_run_id: str) -> RunVersions:
        """고정한 버전. 고정하지 않은 실행은 예외다."""
        pin = self._pinned.get(agent_run_id)
        if pin is None:
            raise VersionDriftError(f"{UNPINNED_RUN}: {agent_run_id}")
        return pin.versions

    def require(self, agent_run_id: str, versions: RunVersions) -> None:
        """실행 중간의 확인. 고정한 조합과 다르면 예외다.

        모델을 부르기 전이나 지표를 저장하기 전에 부른다. 어긋난 값으로 만든 산출물이
        저장된 뒤에는 어느 부분이 다른 조합에서 나왔는지 가릴 수 없다.
        """
        pinned = self.versions_of(agent_run_id)
        if pinned != versions:
            raise VersionDriftError(_drift_detail(agent_run_id, pinned, versions))

    def _require_same(self, existing: RunPin, incoming: RunPin) -> None:
        if existing.versions != incoming.versions:
            raise VersionDriftError(
                _drift_detail(
                    existing.agent_run_id, existing.versions, incoming.versions
                )
            )
        if existing.analysis_version != incoming.analysis_version:
            raise VersionDriftError(
                f"{VERSION_DRIFT}. 실행 {existing.agent_run_id} 의 분석 버전이"
                f" {existing.analysis_version} 에서"
                f" {incoming.analysis_version} 으로 바뀌었다"
            )


def _drift_detail(
    agent_run_id: str, pinned: RunVersions, incoming: RunVersions
) -> str:
    """무엇이 어떻게 바뀌었는지 남긴다. 바뀐 이름만으로는 되짚을 수 없다."""
    before = pinned.as_dict()
    after = incoming.as_dict()
    changed = [
        f"{name}: {before[name]} -> {after[name]}"
        for name in before
        if before[name] != after[name]
    ]
    return f"{VERSION_DRIFT}. 실행 {agent_run_id} 에서 {', '.join(changed)}"


def pin_versions(
    envelope: Envelope,
    versions: RunVersions | None = None,
    log: VersionLog | None = None,
) -> RunPin:
    """실행 하나의 버전을 고정하고 기록한다. 실행이 하나뿐인 경로의 진입점이다."""
    return VersionPinboard(log).pin(envelope, versions)


__all__ = [
    "UNPINNED_RUN",
    "VERSION_DRIFT",
    "RunPin",
    "RunVersions",
    "VersionDriftError",
    "VersionLog",
    "VersionPinboard",
    "pin_versions",
]
