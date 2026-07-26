"""에이전트 공통 실행 계약.

정의는 docs/agent-design.md 를 따른다. 계약은 저장소에 의존하지 않는다.
"""

from careersignal.contracts.check_result import (
    AutonomyLevel,
    CheckName,
    CheckResult,
    CheckVerdict,
    RepairAction,
    Severity,
)
from careersignal.contracts.evidence import (
    EvidenceCandidate,
    EvidenceSet,
    EvidenceUsage,
    RetrievalStrategy,
    UsageType,
)
from careersignal.contracts.objective import EvidenceSlot, ObjectiveContract
from careersignal.contracts.repair import MissingEvidence, RepairOrder
from careersignal.contracts.research import ResearchRequest, ResearchStatus
from careersignal.contracts.run_context import Budget, RunContext
from careersignal.contracts.verification import (
    TypedVerdict,
    VerificationResult,
    is_publishable,
)

__all__ = [
    "AutonomyLevel",
    "Budget",
    "CheckName",
    "CheckResult",
    "CheckVerdict",
    "EvidenceCandidate",
    "EvidenceSet",
    "EvidenceSlot",
    "EvidenceUsage",
    "MissingEvidence",
    "ObjectiveContract",
    "RepairAction",
    "RepairOrder",
    "ResearchRequest",
    "ResearchStatus",
    "RetrievalStrategy",
    "RunContext",
    "Severity",
    "TypedVerdict",
    "UsageType",
    "VerificationResult",
    "is_publishable",
]
