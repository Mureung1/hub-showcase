from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class DocumentType(str, Enum):
    NPC = "npc"
    QUEST = "quest"
    ITEM = "item"
    SYSTEM = "system"
    WORLD_SETTING = "world_setting"
    MEETING_NOTE = "meeting_note"
    UNKNOWN = "unknown"


class IntentType(str, Enum):
    TEMPORARY_IDEA = "temporary_idea"
    CHANGE_REQUEST = "change_request"
    SEARCH = "search"
    NEEDS_CLARIFICATION = "needs_clarification"


class ProposalIntent(str, Enum):
    CREATE_DOCUMENT = "create_document"
    UPDATE_DOCUMENT = "update_document"


class ApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    ON_HOLD = "on_hold"
    CHANGE_REQUESTED = "change_requested"
    REJECTED = "rejected"
    APPLIED = "applied"
    APPLY_FAILED = "apply_failed"
    NEEDS_RECONFIRMATION = "needs_reconfirmation"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


@dataclass
class Source:
    title: str
    path: str
    version: str
    location: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, value: dict[str, Any]) -> "Source":
        return cls(**value)


@dataclass
class ProjectMetadata:
    project_id: str
    name: str
    genre: str = ""
    collaboration_tools: list[str] = field(default_factory=list)
    engine: str = ""
    default_ruleset: str = "default"
    created_at: str = field(default_factory=utc_now)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, value: dict[str, Any]) -> "ProjectMetadata":
        return cls(**value)


@dataclass
class Document:
    project_id: str
    document_id: str
    title: str
    document_type: DocumentType
    path: str
    version: str
    created_at: str
    updated_at: str

    def source(self, location: str = "entire_document") -> Source:
        return Source(
            title=self.title,
            path=self.path,
            version=self.version,
            location=location,
        )

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["document_type"] = self.document_type.value
        return data

    @classmethod
    def from_dict(cls, value: dict[str, Any]) -> "Document":
        data = dict(value)
        data["document_type"] = DocumentType(data["document_type"])
        return cls(**data)


@dataclass
class IntentResult:
    intent: IntentType
    confidence: float
    reason: str

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["intent"] = self.intent.value
        return data


@dataclass
class SearchResult:
    document: Document
    score: float
    excerpt: str


@dataclass
class ChangeProposal:
    proposal_id: str
    project_id: str
    intent: ProposalIntent
    title: str
    summary: str
    after: str
    sources: list[Source]
    status: ApprovalStatus
    risk_level: RiskLevel
    requested_by: str
    created_by_agent: str
    created_at: str
    target_document_id: str | None = None
    before: str | None = None
    base_version: str | None = None
    document_type: DocumentType = DocumentType.UNKNOWN
    missing_required_fields: list[str] = field(default_factory=list)
    missing_field_questions: list[dict[str, str]] = field(default_factory=list)
    conflict_report: dict[str, Any] = field(default_factory=dict)
    impact_scope: list[str] = field(default_factory=list)
    failure_reason: str | None = None
    decision_reason: str | None = None
    decided_by: str | None = None
    decided_at: str | None = None

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["intent"] = self.intent.value
        data["status"] = self.status.value
        data["risk_level"] = self.risk_level.value
        data["document_type"] = self.document_type.value
        data["sources"] = [source.to_dict() for source in self.sources]
        return data

    @classmethod
    def from_dict(cls, value: dict[str, Any]) -> "ChangeProposal":
        data = dict(value)
        data["intent"] = ProposalIntent(data["intent"])
        data["status"] = ApprovalStatus(data["status"])
        data["risk_level"] = RiskLevel(data["risk_level"])
        data["document_type"] = DocumentType(data["document_type"])
        data["sources"] = [Source.from_dict(source) for source in data["sources"]]
        return cls(**data)


@dataclass
class DecisionLogEntry:
    decision_id: str
    project_id: str
    proposal_id: str
    status: ApprovalStatus
    reason: str
    decided_by: str
    decided_at: str

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["status"] = self.status.value
        return data

    @classmethod
    def from_dict(cls, value: dict[str, Any]) -> "DecisionLogEntry":
        data = dict(value)
        data["status"] = ApprovalStatus(data["status"])
        return cls(**data)


@dataclass
class VersionHistoryEntry:
    version_id: str
    project_id: str
    document_id: str
    proposal_id: str
    change_type: ProposalIntent
    before_summary: str
    after_summary: str
    reason: str
    created_at: str
    source_versions: list[Source]

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["change_type"] = self.change_type.value
        data["source_versions"] = [source.to_dict() for source in self.source_versions]
        return data

    @classmethod
    def from_dict(cls, value: dict[str, Any]) -> "VersionHistoryEntry":
        data = dict(value)
        data["change_type"] = ProposalIntent(data["change_type"])
        data["source_versions"] = [
            Source.from_dict(source) for source in data["source_versions"]
        ]
        return cls(**data)
