"""지식 구축 Wiki 에이전트.

정의는 docs/agent-design.md 6장·7.2 와 docs/knowledge-schema.md 8장을 따른다.

Wiki 는 역량을 어느 깊이까지 다뤄야 하는지의 기준을 정의한다. 개별 공고를 복제하지
않으며, 통계 우선순위와 조사 요청으로 생성 대상을 가리고 필드마다 허용된 자료 계층의
근거로만 문서를 만든다.
"""

from careersignal.agents.knowledge.adapter import (
    OpenAIWikiWriter,
    StubWikiWriter,
)
from careersignal.agents.knowledge.agent import (
    DRAFT_STATUS,
    PREVALENCE_FAMILY,
    WikiBuilder,
    depth_criteria_value,
    depth_guidance,
    page_identifier,
    revision_identifier,
    select_targets,
)
from careersignal.agents.knowledge.contract import (
    EVIDENCE_NOT_CITED,
    FIELD_ALLOWED_TIERS,
    FIELD_USE,
    MISSING_REQUIRED_FIELD,
    NO_ALLOWED_EVIDENCE,
    NO_CONTENT,
    NO_KNOWLEDGE_VERSION,
    NO_TAXONOMY_VERSION,
    PAGE_EXISTS,
    REQUIRED_FIELDS,
    TEXT_FIELDS,
    TRANSACTION_LOST,
    WIKI_FIELDS,
    EvidenceChunk,
    PageOutcome,
    TargetReason,
    WikiFieldDraft,
    WikiFieldRequest,
    WikiOutcome,
    WikiRepository,
    WikiTarget,
    WikiWriter,
    allowed_evidence,
)
from careersignal.agents.knowledge.prompts import (
    FIELD_INSTRUCTIONS,
    FIELD_RESPONSE_SCHEMA,
    NO_EVIDENCE,
    NO_GUIDANCE,
    WIKI_FIELD_PROMPT,
    WIKI_TASK,
    user_message,
)

__all__ = [
    "DRAFT_STATUS",
    "EVIDENCE_NOT_CITED",
    "FIELD_ALLOWED_TIERS",
    "FIELD_INSTRUCTIONS",
    "FIELD_RESPONSE_SCHEMA",
    "FIELD_USE",
    "MISSING_REQUIRED_FIELD",
    "NO_ALLOWED_EVIDENCE",
    "NO_CONTENT",
    "NO_EVIDENCE",
    "NO_GUIDANCE",
    "NO_KNOWLEDGE_VERSION",
    "NO_TAXONOMY_VERSION",
    "PAGE_EXISTS",
    "PREVALENCE_FAMILY",
    "REQUIRED_FIELDS",
    "TEXT_FIELDS",
    "TRANSACTION_LOST",
    "WIKI_FIELDS",
    "WIKI_FIELD_PROMPT",
    "WIKI_TASK",
    "EvidenceChunk",
    "OpenAIWikiWriter",
    "PageOutcome",
    "StubWikiWriter",
    "TargetReason",
    "WikiBuilder",
    "WikiFieldDraft",
    "WikiFieldRequest",
    "WikiOutcome",
    "WikiRepository",
    "WikiTarget",
    "WikiWriter",
    "allowed_evidence",
    "depth_criteria_value",
    "depth_guidance",
    "page_identifier",
    "revision_identifier",
    "select_targets",
    "user_message",
]
