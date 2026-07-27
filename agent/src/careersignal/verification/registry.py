"""검사 등록.

정의는 docs/agent-design.md 9장을 따른다.
이 모듈은 검사의 명세만 담는다. 검사의 내용은 등록된 구현이 담당한다.

명세는 고정이고 구현만 Phase 별로 채워진다. 명세를 코드에 두는 이유는,
구현이 없는 검사를 러너가 조용히 건너뛰지 않고 미등록으로 기록하게 하기 위해서다.
"""

from __future__ import annotations

from collections.abc import Sequence

from pydantic import BaseModel, ConfigDict, Field

from careersignal.contracts.check_result import (
    CHECK_AUTONOMY,
    AutonomyLevel,
    CheckName,
)
from careersignal.verification.protocol import Check


class CheckSpec(BaseModel):
    """검사 한 종의 명세."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    check: CheckName
    order: int = Field(ge=1)
    purpose: str
    aggregate: bool = False
    """앞선 검사의 결과를 입력으로 받는 집계 단계. 러너가 실행하지 않는다."""

    @property
    def autonomy(self) -> AutonomyLevel:
        """자율성 등급은 계약의 표에서 파생한다. 여기서 다시 선언하지 않는다."""
        return CHECK_AUTONOMY[self.check]


CHECK_SPECS: tuple[CheckSpec, ...] = (
    CheckSpec(
        check=CheckName.SCHEMA,
        order=1,
        purpose="타입, 필수 필드, 허용 값",
    ),
    CheckSpec(
        check=CheckName.SOURCE_POLICY,
        order=2,
        purpose="자료 계층과 허용 용도, 시간 적합성",
    ),
    CheckSpec(
        check=CheckName.CITATION_SPAN,
        order=3,
        purpose="근거 위치가 원문과 일치",
    ),
    CheckSpec(
        check=CheckName.NUMERICAL,
        order=4,
        purpose="분모, 표본, 중복 제거, 재계산 일치",
    ),
    CheckSpec(
        check=CheckName.ENTAILMENT,
        order=5,
        purpose="근거가 주장을 지지하는지, 과잉 일반화",
    ),
    CheckSpec(
        check=CheckName.CROSS_MODEL,
        order=6,
        purpose="다른 모델 계열의 표본 재판정",
    ),
    CheckSpec(
        check=CheckName.CONTRADICTION,
        order=7,
        purpose="상충 근거와 부재 확인",
    ),
    CheckSpec(
        check=CheckName.TYPED_VERDICT,
        order=8,
        purpose="판정 집계와 상태 전이",
        aggregate=True,
    ),
)
"""docs/agent-design.md 9장의 검사 여덟 종. 순서가 실행 순서다."""


class CheckRegistry:
    """검사 명세와 구현의 연결.

    명세는 생성 시점에 고정되고 구현만 등록으로 채운다. 등록되지 않은 검사는
    러너가 미등록으로 기록하므로, 구현이 빠진 상태가 기록에 남는다.
    """

    def __init__(self, specs: Sequence[CheckSpec] = CHECK_SPECS) -> None:
        self._specs: tuple[CheckSpec, ...] = tuple(sorted(specs, key=lambda s: s.order))
        self._by_name: dict[CheckName, CheckSpec] = {s.check: s for s in self._specs}
        self._implementations: dict[CheckName, Check] = {}
        if len(self._by_name) != len(self._specs):
            raise ValueError("같은 검사를 두 번 선언할 수 없다")

    # ------------------------------------------------------------ 명세
    @property
    def specs(self) -> tuple[CheckSpec, ...]:
        return self._specs

    def spec(self, check: CheckName) -> CheckSpec:
        if check not in self._by_name:
            raise KeyError(f"{check} 는 선언되지 않은 검사다")
        return self._by_name[check]

    def executable(self) -> tuple[CheckSpec, ...]:
        """러너가 실행하는 검사. 집계 단계는 제외한다."""
        return tuple(s for s in self._specs if not s.aggregate)

    # ------------------------------------------------------------ 구현
    def register(self, check: CheckName, implementation: Check) -> None:
        spec = self.spec(check)
        if spec.aggregate:
            raise ValueError(
                f"{check} 는 집계 단계다. 러너가 실행하지 않으므로 등록하지 않는다"
            )
        if check in self._implementations:
            raise ValueError(f"{check} 의 구현이 이미 등록됐다")
        if not callable(implementation):
            raise TypeError(f"{check} 의 구현은 호출 가능해야 한다")
        self._implementations[check] = implementation

    def implementation(self, check: CheckName) -> Check | None:
        self.spec(check)
        return self._implementations.get(check)

    def unregistered(self) -> tuple[CheckName, ...]:
        """실행 대상인데 구현이 없는 검사."""
        return tuple(
            s.check for s in self.executable() if s.check not in self._implementations
        )
