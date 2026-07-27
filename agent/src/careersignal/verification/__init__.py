"""검사 등록·실행·결과 저장 프레임워크.

정의는 docs/agent-design.md 9장을 따른다.
검사의 내용은 `verification/checks/` 가 담고, 이 패키지는 실행 틀만 담는다.
"""

from careersignal.verification.protocol import (
    REASON_CHECK_ERROR,
    REASON_NOT_APPLICABLE,
    REASON_NOT_REGISTERED,
    Check,
    CheckContext,
    CheckOutcome,
    not_applicable,
    passed,
)
from careersignal.verification.registry import (
    CHECK_SPECS,
    CheckRegistry,
    CheckSpec,
)
from careersignal.verification.runner import CheckRunner, CheckRunReport

__all__ = [
    "CHECK_SPECS",
    "REASON_CHECK_ERROR",
    "REASON_NOT_APPLICABLE",
    "REASON_NOT_REGISTERED",
    "Check",
    "CheckContext",
    "CheckOutcome",
    "CheckRegistry",
    "CheckRunReport",
    "CheckRunner",
    "CheckSpec",
    "not_applicable",
    "passed",
]
