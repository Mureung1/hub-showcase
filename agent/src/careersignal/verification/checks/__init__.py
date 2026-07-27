"""검사 구현.

정의는 docs/agent-design.md 9장을 따른다. 각 검사는 실행 틀에 등록되어 실행된다.
구현이 없는 검사는 러너가 `CHECK_NOT_REGISTERED` 로 기록한다.
"""

from careersignal.verification.checks.citation import (
    TARGET_CLAIM,
    TARGET_MENTION,
    CitationReader,
    citation_span_check,
)
from careersignal.verification.checks.schema import (
    SCHEMA_RULES,
    SchemaRule,
    rules_for,
    schema_check,
)

__all__ = [
    "SCHEMA_RULES",
    "TARGET_CLAIM",
    "TARGET_MENTION",
    "CitationReader",
    "SchemaRule",
    "citation_span_check",
    "rules_for",
    "schema_check",
]
