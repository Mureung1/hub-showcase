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
from careersignal.verification.checks.source_policy import (
    CLAIM_TYPE_USE,
    TARGET_WIKI,
    WIKI_FIELD_USE,
    SourcePolicyReader,
    source_policy_check,
)

__all__ = [
    "CLAIM_TYPE_USE",
    "SCHEMA_RULES",
    "TARGET_CLAIM",
    "TARGET_MENTION",
    "TARGET_WIKI",
    "WIKI_FIELD_USE",
    "CitationReader",
    "SchemaRule",
    "SourcePolicyReader",
    "citation_span_check",
    "rules_for",
    "schema_check",
    "source_policy_check",
]
