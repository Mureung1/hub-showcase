"""차원 발견·승격·할당.

정의는 docs/statistics-model.md 3장을 따른다. 활성 분류체계로 설명되는 표현과
설명되지 않는 표현을 나눠 추출하고, 잔여 표현을 차원 후보로 만든다. 후보는
`proposed` 로 남으며 `active` 이전의 후보는 통계에 포함하지 않는다. 승격 심사를
지난 후보만 새 분류체계 버전의 차원이 되고, 할당은 그 버전을 기준으로 표현과
차원을 잇는다.

패키지는 유형과 진입점, 정책 이름만 내보낸다. 사유 코드와 판정 상수는 모듈에서
직접 import 한다. `PROPOSED` 처럼 여러 모듈에 같은 이름이 있어 한 이름 공간에
모으면 어느 단계의 상수인지 읽히지 않는다.
"""

from careersignal.taxonomy.assignment import (
    ALIAS_EXACT,
    MANUAL,
    METHOD_CHAIN,
    METHOD_CONFIDENCE,
    METHODS,
    MODEL_JUDGMENT,
    VECTOR_MATCH,
    AssignmentOutcome,
    RequirementAssignment,
    assignment_identifier,
)
from careersignal.taxonomy.depth import judge_depth
from careersignal.taxonomy.discovery import (
    NEIGHBOUR_LIMIT,
    NO_ACTIVE_TAXONOMY,
    PROPOSED,
    TAXONOMY_MISMATCH,
    UNNORMALIZABLE,
    CandidateDiscovery,
    CandidateSummary,
    DiscoveryOutcome,
    candidate_identifier,
)
from careersignal.taxonomy.lifecycle import (
    ACTIVE,
    LIFECYCLE_STATUSES,
    PROMOTION_CHAIN,
    TERMINAL_STATUSES,
    can_transition,
    is_terminal,
    path_to,
    require_transition,
)
from careersignal.taxonomy.promotion import (
    DECISIONS,
    HOLD,
    MERGE,
    POLICY_V1,
    PROMOTE,
    REJECT,
    CandidateDecision,
    CandidateEvidence,
    CandidateReview,
    EvalComparison,
    PromotionPolicy,
    ReviewOutcome,
    judge_candidate,
    policy_for,
)
from careersignal.taxonomy.publication import (
    PublicationOutcome,
    TaxonomyPublication,
)
from careersignal.taxonomy.requiredness import (
    REQUIREDNESS,
    Requiredness,
    normalize_requiredness,
)
from careersignal.taxonomy.vocabulary import (
    ALIAS,
    CANONICAL,
    DISPLAY,
    DimensionEntry,
    Vocabulary,
    VocabularyMatch,
    normalize_expression,
)

__all__ = [
    "ACTIVE",
    "ALIAS",
    "ALIAS_EXACT",
    "CANONICAL",
    "DECISIONS",
    "DISPLAY",
    "HOLD",
    "LIFECYCLE_STATUSES",
    "MANUAL",
    "MERGE",
    "METHODS",
    "METHOD_CHAIN",
    "METHOD_CONFIDENCE",
    "MODEL_JUDGMENT",
    "NEIGHBOUR_LIMIT",
    "NO_ACTIVE_TAXONOMY",
    "POLICY_V1",
    "PROMOTE",
    "PROMOTION_CHAIN",
    "PROPOSED",
    "REJECT",
    "REQUIREDNESS",
    "TAXONOMY_MISMATCH",
    "TERMINAL_STATUSES",
    "UNNORMALIZABLE",
    "VECTOR_MATCH",
    "AssignmentOutcome",
    "CandidateDecision",
    "CandidateDiscovery",
    "CandidateEvidence",
    "CandidateReview",
    "CandidateSummary",
    "DimensionEntry",
    "DiscoveryOutcome",
    "EvalComparison",
    "PromotionPolicy",
    "PublicationOutcome",
    "Requiredness",
    "RequirementAssignment",
    "ReviewOutcome",
    "TaxonomyPublication",
    "Vocabulary",
    "VocabularyMatch",
    "assignment_identifier",
    "can_transition",
    "candidate_identifier",
    "is_terminal",
    "judge_candidate",
    "judge_depth",
    "normalize_expression",
    "normalize_requiredness",
    "path_to",
    "policy_for",
    "require_transition",
]
