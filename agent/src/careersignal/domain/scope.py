"""분석 범위.

정의는 docs/architecture.md 2장을 따른다.
저장소와 생성 모델을 import 하지 않는다.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class ScopeLevel(StrEnum):
    OVERALL = "overall"
    CLUSTER = "cluster"
    POSTING = "posting"


@dataclass(frozen=True, slots=True)
class Scope:
    """분석 범위. `overall`은 직무 전체이므로 `scope_id`가 없다."""

    job_role_id: str
    level: ScopeLevel
    scope_id: str | None = None

    def __post_init__(self) -> None:
        if not self.job_role_id:
            raise ValueError("job_role_id 는 비어 있을 수 없다")
        if self.level is ScopeLevel.OVERALL and self.scope_id is not None:
            raise ValueError("overall 범위는 scope_id 를 갖지 않는다")
        if self.level is not ScopeLevel.OVERALL and not self.scope_id:
            raise ValueError(f"{self.level} 범위는 scope_id 가 필요하다")

    @property
    def key(self) -> str:
        return f"{self.job_role_id}:{self.level}:{self.scope_id or ''}"

    def narrows_to(self, other: Scope) -> bool:
        """other 가 self 보다 좁은 범위인지 판정한다."""
        if self.job_role_id != other.job_role_id:
            return False
        order = {ScopeLevel.OVERALL: 0, ScopeLevel.CLUSTER: 1, ScopeLevel.POSTING: 2}
        return order[other.level] > order[self.level]
