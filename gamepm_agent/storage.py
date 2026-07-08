from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import Any, Callable, TypeVar

from .models import (
    ChangeProposal,
    DecisionLogEntry,
    Document,
    DocumentType,
    ProjectMetadata,
    VersionHistoryEntry,
    utc_now,
)

T = TypeVar("T")


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9가-힣_-]+", "-", value.strip()).strip("-").lower()
    return slug or "untitled"


def content_version(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()[:16]


class FileStore:
    def __init__(self, root: str | Path = ".gamepm") -> None:
        self.root = Path(root)

    def project_dir(self, project_id: str) -> Path:
        return self.root / "projects" / project_id

    def documents_dir(self, project_id: str) -> Path:
        return self.project_dir(project_id) / "documents"

    def metadata_path(self, project_id: str) -> Path:
        return self.project_dir(project_id) / "project.json"

    def proposals_path(self, project_id: str) -> Path:
        return self.project_dir(project_id) / "approval_queue.json"

    def decisions_path(self, project_id: str) -> Path:
        return self.project_dir(project_id) / "decision_log.json"

    def versions_path(self, project_id: str) -> Path:
        return self.project_dir(project_id) / "version_history.json"

    def ideas_path(self, project_id: str) -> Path:
        return self.project_dir(project_id) / "temporary_ideas.json"

    def ensure_project(self, metadata: ProjectMetadata) -> ProjectMetadata:
        self.documents_dir(metadata.project_id).mkdir(parents=True, exist_ok=True)
        path = self.metadata_path(metadata.project_id)
        if not path.exists():
            self._write_json(path, metadata.to_dict())
        return ProjectMetadata.from_dict(self._read_json(path))

    def read_project(self, project_id: str) -> ProjectMetadata:
        return ProjectMetadata.from_dict(self._read_json(self.metadata_path(project_id)))

    def save_document(
        self,
        project_id: str,
        title: str,
        document_type: DocumentType,
        content: str,
        document_id: str | None = None,
    ) -> Document:
        self.documents_dir(project_id).mkdir(parents=True, exist_ok=True)
        doc_id = document_id or self.unique_document_id(project_id, title)
        path = self.documents_dir(project_id) / f"{doc_id}.md"
        created_at = utc_now()
        if path.exists():
            existing = self.get_document(project_id, doc_id)
            created_at = existing.created_at
        path.write_text(content, encoding="utf-8")
        sidecar = self._document_meta_path(project_id, doc_id)
        document = Document(
            project_id=project_id,
            document_id=doc_id,
            title=title,
            document_type=document_type,
            path=str(path.relative_to(self.root)),
            version=content_version(content),
            created_at=created_at,
            updated_at=utc_now(),
        )
        self._write_json(sidecar, document.to_dict())
        return document

    def get_document(self, project_id: str, document_id: str) -> Document:
        return Document.from_dict(self._read_json(self._document_meta_path(project_id, document_id)))

    def read_document_content(self, project_id: str, document_id: str) -> str:
        return self._document_path(project_id, document_id).read_text(encoding="utf-8")

    def list_documents(self, project_id: str) -> list[Document]:
        directory = self.documents_dir(project_id)
        if not directory.exists():
            return []
        documents: list[Document] = []
        for path in sorted(directory.glob("*.json")):
            documents.append(Document.from_dict(self._read_json(path)))
        return documents

    def unique_document_id(self, project_id: str, title: str) -> str:
        base = slugify(title)
        candidate = base
        index = 2
        while self._document_path(project_id, candidate).exists():
            candidate = f"{base}-{index}"
            index += 1
        return candidate

    def load_proposals(self, project_id: str) -> list[ChangeProposal]:
        return self._load_list(self.proposals_path(project_id), ChangeProposal.from_dict)

    def save_proposals(self, project_id: str, proposals: list[ChangeProposal]) -> None:
        self._write_json(self.proposals_path(project_id), [item.to_dict() for item in proposals])

    def upsert_proposal(self, proposal: ChangeProposal) -> None:
        proposals = self.load_proposals(proposal.project_id)
        replaced = False
        for index, current in enumerate(proposals):
            if current.proposal_id == proposal.proposal_id:
                proposals[index] = proposal
                replaced = True
                break
        if not replaced:
            proposals.append(proposal)
        self.save_proposals(proposal.project_id, proposals)

    def get_proposal(self, project_id: str, proposal_id: str) -> ChangeProposal:
        for proposal in self.load_proposals(project_id):
            if proposal.proposal_id == proposal_id:
                return proposal
        raise KeyError(f"Proposal not found: {proposal_id}")

    def append_decision(self, entry: DecisionLogEntry) -> None:
        entries = self._load_list(self.decisions_path(entry.project_id), DecisionLogEntry.from_dict)
        entries.append(entry)
        self._write_json(self.decisions_path(entry.project_id), [item.to_dict() for item in entries])

    def load_decisions(self, project_id: str) -> list[DecisionLogEntry]:
        return self._load_list(self.decisions_path(project_id), DecisionLogEntry.from_dict)

    def append_version(self, entry: VersionHistoryEntry) -> None:
        entries = self._load_list(self.versions_path(entry.project_id), VersionHistoryEntry.from_dict)
        entries.append(entry)
        self._write_json(self.versions_path(entry.project_id), [item.to_dict() for item in entries])

    def load_versions(self, project_id: str) -> list[VersionHistoryEntry]:
        return self._load_list(self.versions_path(project_id), VersionHistoryEntry.from_dict)

    def append_idea(self, project_id: str, value: dict[str, Any]) -> None:
        ideas = self._read_json(self.ideas_path(project_id), default=[])
        ideas.append(value)
        self._write_json(self.ideas_path(project_id), ideas)

    def load_ideas(self, project_id: str) -> list[dict[str, Any]]:
        return self._read_json(self.ideas_path(project_id), default=[])

    def _document_path(self, project_id: str, document_id: str) -> Path:
        return self.documents_dir(project_id) / f"{document_id}.md"

    def _document_meta_path(self, project_id: str, document_id: str) -> Path:
        return self.documents_dir(project_id) / f"{document_id}.json"

    def _load_list(self, path: Path, factory: Callable[[dict[str, Any]], T]) -> list[T]:
        return [factory(item) for item in self._read_json(path, default=[])]

    def _read_json(self, path: Path, default: Any | None = None) -> Any:
        if not path.exists():
            if default is not None:
                return default
            raise FileNotFoundError(path)
        return json.loads(path.read_text(encoding="utf-8"))

    def _write_json(self, path: Path, value: Any) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
