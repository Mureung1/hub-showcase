"""차원 발견·승격·할당.

정의는 docs/statistics-model.md 3장을 따른다. 활성 분류체계로 설명되는 표현과
설명되지 않는 표현을 나눠 추출하고, 잔여 표현을 차원 후보로 만든다. 후보는
`proposed` 로 남으며 `active` 이전의 후보는 통계에 포함하지 않는다.
"""

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
    "ALIAS",
    "CANONICAL",
    "DISPLAY",
    "NEIGHBOUR_LIMIT",
    "NO_ACTIVE_TAXONOMY",
    "PROPOSED",
    "TAXONOMY_MISMATCH",
    "UNNORMALIZABLE",
    "CandidateDiscovery",
    "CandidateSummary",
    "DimensionEntry",
    "DiscoveryOutcome",
    "Vocabulary",
    "VocabularyMatch",
    "candidate_identifier",
    "normalize_expression",
]
