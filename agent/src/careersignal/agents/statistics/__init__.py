"""통계 분석 에이전트.

정의는 docs/agent-design.md 7.3 을 따른다. 원문 표현의 추출과 차원 후보 명명에만
생성 모델을 쓰고, 빈도·비율·추세·조합은 집계 파이프라인이 규칙으로 계산한다.
"""

from careersignal.agents.statistics.agent import (
    ExtractionOutcome,
    MentionCollector,
    mention_identifier,
)
from careersignal.agents.statistics.assigner import (
    ASSIGNMENT_RESPONSE_SCHEMA,
    ASSIGNMENT_TASK,
    MODEL_ASSIGNMENT_PROMPT,
    AssignmentJudgment,
    DimensionAssigner,
    OpenAIDimensionAssigner,
    StubDimensionAssigner,
)
from careersignal.agents.statistics.extractor import (
    BULLET_MARKS,
    EXTRACTION_TASK,
    MENTION_EXTRACTION_PROMPT,
    MENTION_RESPONSE_SCHEMA,
    NON_REQUIREMENT_KINDS,
    REQUIREMENT_SCOPE,
    MentionCandidate,
    MentionExtractor,
    OpenAIMentionExtractor,
    StubMentionExtractor,
)
from careersignal.agents.statistics.judge import (
    JUDGEMENT_RESPONSE_SCHEMA,
    JUDGEMENT_TASK,
    NAMING_TASK,
    NO_RELATION,
    RELATION_JUDGEMENT_PROMPT,
    RELATIONS,
    DimensionOption,
    OpenAIRelationJudge,
    RelationJudge,
    RelationJudgment,
    StubRelationJudge,
)
from careersignal.agents.statistics.spans import (
    EXHAUSTED,
    NOT_FOUND,
    Span,
    SpanResolver,
    quoted,
)

__all__ = [
    "EXHAUSTED",
    "ExtractionOutcome",
    "MentionCollector",
    "NOT_FOUND",
    "Span",
    "SpanResolver",
    "mention_identifier",
    "quoted",
    "ASSIGNMENT_RESPONSE_SCHEMA",
    "ASSIGNMENT_TASK",
    "MODEL_ASSIGNMENT_PROMPT",
    "AssignmentJudgment",
    "DimensionAssigner",
    "OpenAIDimensionAssigner",
    "StubDimensionAssigner",
    "BULLET_MARKS",
    "EXTRACTION_TASK",
    "MENTION_EXTRACTION_PROMPT",
    "MENTION_RESPONSE_SCHEMA",
    "NON_REQUIREMENT_KINDS",
    "REQUIREMENT_SCOPE",
    "MentionCandidate",
    "MentionExtractor",
    "OpenAIMentionExtractor",
    "StubMentionExtractor",
    "DimensionOption",
    "JUDGEMENT_RESPONSE_SCHEMA",
    "JUDGEMENT_TASK",
    "NAMING_TASK",
    "NO_RELATION",
    "OpenAIRelationJudge",
    "RELATIONS",
    "RELATION_JUDGEMENT_PROMPT",
    "RelationJudge",
    "RelationJudgment",
    "StubRelationJudge",
]
