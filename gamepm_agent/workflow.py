from __future__ import annotations

import difflib
import re
import uuid
from pathlib import Path

from .agent_engine import AgentEngine, AgentEngineError, RuleBasedAgentEngine
from .models import (
    ApprovalStatus,
    ChangeProposal,
    DecisionLogEntry,
    Document,
    DocumentType,
    IntentResult,
    IntentType,
    ProjectMetadata,
    ProposalIntent,
    RiskLevel,
    SearchResult,
    Source,
    VersionHistoryEntry,
    utc_now,
)
from .storage import FileStore, content_version


class GamePMWorkflow:
    def __init__(
        self,
        store: FileStore | None = None,
        agent_engine: AgentEngine | None = None,
    ) -> None:
        self.store = store or FileStore()
        self.agent_engine = agent_engine or RuleBasedAgentEngine()

    def create_project(
        self,
        project_id: str,
        name: str,
        genre: str = "",
        engine: str = "",
        collaboration_tools: list[str] | None = None,
    ) -> ProjectMetadata:
        return self.store.ensure_project(
            ProjectMetadata(
                project_id=project_id,
                name=name,
                genre=genre,
                engine=engine,
                collaboration_tools=collaboration_tools or [],
            )
        )

    def add_document(
        self,
        project_id: str,
        title: str,
        content: str,
        document_type: DocumentType = DocumentType.UNKNOWN,
    ) -> Document:
        self.store.read_project(project_id)
        return self.store.save_document(project_id, title, document_type, content)

    def classify(self, text: str) -> IntentResult:
        return self.agent_engine.classify_intent(text, {})

    def submit_input(
        self,
        project_id: str,
        text: str,
        requested_by: str = "user",
        agent_name: str | None = None,
    ) -> dict[str, object]:
        self.store.read_project(project_id)
        project = self.store.read_project(project_id)
        project_context = {"project": project.to_dict()}
        input_source = Source(
            title="User Input",
            path="chat",
            version=content_version(text),
            location="submitted_text",
        )
        try:
            intent = self.agent_engine.classify_intent(text, project_context)
        except AgentEngineError as exc:
            intent = IntentResult(
                IntentType.NEEDS_CLARIFICATION,
                0.0,
                str(exc),
            )

        if intent.intent == IntentType.TEMPORARY_IDEA:
            idea = {
                "idea_id": self._new_id("idea"),
                "project_id": project_id,
                "original_text": text,
                "author": requested_by,
                "created_at": utc_now(),
                "source": input_source.to_dict(),
                "tags": [],
                "related_document_candidates": [],
            }
            self.store.append_idea(project_id, idea)
            return {"intent": intent.to_dict(), "temporary_idea": idea}

        if intent.intent == IntentType.SEARCH:
            return {
                "intent": intent.to_dict(),
                "results": [
                    self._search_result_to_dict(result)
                    for result in self.search_documents(project_id, text)
                ],
            }

        if intent.intent == IntentType.NEEDS_CLARIFICATION:
            return {
                "intent": intent.to_dict(),
                "question": "Should this be treated as a document change request or a search question?",
            }

        try:
            proposal = self.create_change_proposal(
                project_id=project_id,
                request_text=text,
                requested_by=requested_by,
                agent_name=agent_name or self.agent_engine.name,
                input_source=input_source,
            )
        except AgentEngineError as exc:
            return {
                "intent": intent.to_dict(),
                "question": "The agent could not produce a valid structured change proposal.",
                "error": str(exc),
            }
        return {"intent": intent.to_dict(), "proposal": proposal.to_dict()}

    def search_documents(
        self,
        project_id: str,
        query: str,
        limit: int = 5,
    ) -> list[SearchResult]:
        self.store.read_project(project_id)
        query_terms = self._terms(query)
        results: list[SearchResult] = []
        for document in self.store.list_documents(project_id):
            content = self.store.read_document_content(project_id, document.document_id)
            haystack = f"{document.title}\n{content}"
            score = self._score(query_terms, self._terms(haystack))
            if score <= 0:
                continue
            results.append(
                SearchResult(
                    document=document,
                    score=score,
                    excerpt=self._excerpt(content, query_terms),
                )
            )
        return sorted(results, key=lambda result: result.score, reverse=True)[:limit]

    def create_change_proposal(
        self,
        project_id: str,
        request_text: str,
        requested_by: str,
        agent_name: str,
        input_source: Source,
    ) -> ChangeProposal:
        search_results = self.search_documents(project_id, request_text, limit=3)
        best_match = search_results[0] if search_results else None
        before: str | None = None
        base_version: str | None = None

        project = self.store.read_project(project_id)
        project_context: dict[str, object] = {
            "project": project.to_dict(),
        }
        if best_match:
            project_context["target_document_content"] = self.store.read_document_content(
                project_id,
                best_match.document.document_id,
            )

        draft = self.agent_engine.plan_document_change(
            request_text,
            project_context,
            search_results,
            input_source,
        )

        target_document_id = draft.target_document_id
        if draft.intent == ProposalIntent.UPDATE_DOCUMENT:
            if target_document_id is None:
                raise AgentEngineError("Update proposal is missing target_document_id.")
            document = self.store.get_document(project_id, target_document_id)
            before = self.store.read_document_content(project_id, document.document_id)
            base_version = document.version
            if not any(source.path == document.source().path for source in draft.sources):
                draft.sources.append(document.source("target_document"))

        missing_questions = self.agent_engine.generate_missing_field_questions(
            draft.document_type,
            draft.after,
            draft.missing_required_fields,
        )
        conflict_report = self.agent_engine.analyze_conflict_and_impact(
            request_text,
            search_results,
        )
        proposal = ChangeProposal(
            proposal_id=self._new_id("proposal"),
            project_id=project_id,
            intent=draft.intent,
            target_document_id=target_document_id,
            title=draft.title,
            summary=draft.summary,
            before=before,
            after=draft.after,
            base_version=base_version,
            sources=draft.sources,
            status=ApprovalStatus.PENDING,
            risk_level=draft.risk_level,
            requested_by=requested_by,
            created_by_agent=agent_name or self.agent_engine.name,
            created_at=utc_now(),
            document_type=draft.document_type,
            missing_required_fields=draft.missing_required_fields,
            missing_field_questions=missing_questions,
            conflict_report=conflict_report,
            impact_scope=draft.impact_scope,
        )
        self.store.upsert_proposal(proposal)
        return proposal

    def decide_proposal(
        self,
        project_id: str,
        proposal_id: str,
        status: ApprovalStatus,
        decided_by: str,
        reason: str = "",
    ) -> ChangeProposal:
        if status not in {
            ApprovalStatus.APPROVED,
            ApprovalStatus.ON_HOLD,
            ApprovalStatus.CHANGE_REQUESTED,
            ApprovalStatus.REJECTED,
        }:
            raise ValueError(f"Unsupported decision status: {status.value}")

        proposal = self.store.get_proposal(project_id, proposal_id)
        if proposal.status not in {ApprovalStatus.PENDING, ApprovalStatus.NEEDS_RECONFIRMATION}:
            raise ValueError(f"Cannot decide proposal in status {proposal.status.value}")

        proposal.status = status
        proposal.decision_reason = reason
        proposal.decided_by = decided_by
        proposal.decided_at = utc_now()
        self.store.upsert_proposal(proposal)
        self.store.append_decision(
            DecisionLogEntry(
                decision_id=self._new_id("decision"),
                project_id=project_id,
                proposal_id=proposal_id,
                status=status,
                reason=reason,
                decided_by=decided_by,
                decided_at=proposal.decided_at,
            )
        )
        return proposal

    def apply_approved_proposal(self, project_id: str, proposal_id: str) -> ChangeProposal:
        proposal = self.store.get_proposal(project_id, proposal_id)
        if proposal.status != ApprovalStatus.APPROVED:
            raise ValueError(f"Only approved proposals can be applied: {proposal.status.value}")

        try:
            if proposal.intent == ProposalIntent.UPDATE_DOCUMENT:
                if not proposal.target_document_id or proposal.base_version is None:
                    raise ValueError("Update proposal is missing target document or base version.")
                current = self.store.get_document(project_id, proposal.target_document_id)
                if current.version != proposal.base_version:
                    proposal.status = ApprovalStatus.NEEDS_RECONFIRMATION
                    proposal.failure_reason = (
                        "Target document changed after proposal creation. Reconfirm before applying."
                    )
                    self.store.upsert_proposal(proposal)
                    return proposal
                document = self.store.save_document(
                    project_id=project_id,
                    title=current.title,
                    document_type=current.document_type,
                    content=proposal.after,
                    document_id=current.document_id,
                )
            else:
                document = self.store.save_document(
                    project_id=project_id,
                    title=proposal.title,
                    document_type=proposal.document_type,
                    content=proposal.after,
                )

            self.store.append_version(
                VersionHistoryEntry(
                    version_id=self._new_id("version"),
                    project_id=project_id,
                    document_id=document.document_id,
                    proposal_id=proposal.proposal_id,
                    change_type=proposal.intent,
                    before_summary=self._first_sentence(proposal.before or ""),
                    after_summary=self._first_sentence(proposal.after),
                    reason=proposal.decision_reason or "",
                    created_at=utc_now(),
                    source_versions=proposal.sources,
                )
            )
            proposal.status = ApprovalStatus.APPLIED
            proposal.target_document_id = document.document_id
            proposal.base_version = document.version
            proposal.failure_reason = None
        except Exception as exc:
            proposal.status = ApprovalStatus.APPLY_FAILED
            proposal.failure_reason = str(exc)

        self.store.upsert_proposal(proposal)
        return proposal

    def diff_for_proposal(self, project_id: str, proposal_id: str) -> str:
        proposal = self.store.get_proposal(project_id, proposal_id)
        before = (proposal.before or "").splitlines(keepends=True)
        after = proposal.after.splitlines(keepends=True)
        return "".join(
            difflib.unified_diff(
                before,
                after,
                fromfile="before.md",
                tofile="after.md",
            )
        )

    def list_proposals(self, project_id: str) -> list[ChangeProposal]:
        return self.store.load_proposals(project_id)

    def list_documents(self, project_id: str) -> list[Document]:
        return self.store.list_documents(project_id)

    def _append_change_section(self, before: str, request_text: str) -> str:
        section = [
            "",
            "## Proposed Change",
            "",
            request_text.strip(),
            "",
        ]
        return before.rstrip() + "\n" + "\n".join(section)

    def _risk_for(
        self,
        intent: ProposalIntent,
        missing: list[str],
        best_match: SearchResult | None,
    ) -> RiskLevel:
        if missing:
            return RiskLevel.MEDIUM
        if intent == ProposalIntent.UPDATE_DOCUMENT and best_match and best_match.score < 0.3:
            return RiskLevel.MEDIUM
        return RiskLevel.LOW

    def _summary_for(
        self,
        intent: ProposalIntent,
        title: str,
        missing: list[str],
    ) -> str:
        action = "Update existing document" if intent == ProposalIntent.UPDATE_DOCUMENT else "Create new document"
        suffix = f" Missing required fields: {', '.join(missing)}." if missing else ""
        return f"{action}: {title}.{suffix}"

    def _impact_scope(
        self,
        intent: ProposalIntent,
        best_match: SearchResult | None,
    ) -> list[str]:
        if intent == ProposalIntent.UPDATE_DOCUMENT and best_match:
            return [best_match.document.document_id]
        return ["new_document"]

    def _search_result_to_dict(self, result: SearchResult) -> dict[str, object]:
        return {
            "document": result.document.to_dict(),
            "score": result.score,
            "excerpt": result.excerpt,
            "source": result.document.source("search_result").to_dict(),
        }

    def _terms(self, text: str) -> set[str]:
        return {
            term
            for term in re.split(r"[^0-9A-Za-z가-힣_]+", text.lower())
            if len(term) >= 2
        }

    def _score(self, query_terms: set[str], document_terms: set[str]) -> float:
        if not query_terms or not document_terms:
            return 0.0
        return len(query_terms & document_terms) / len(query_terms)

    def _excerpt(self, content: str, query_terms: set[str]) -> str:
        lines = [line.strip() for line in content.splitlines() if line.strip()]
        for line in lines:
            if self._terms(line) & query_terms:
                return line[:240]
        return (lines[0] if lines else "")[:240]

    def _first_sentence(self, value: str) -> str:
        compact = " ".join(value.split())
        return compact[:160]

    def _new_id(self, prefix: str) -> str:
        return f"{prefix}_{uuid.uuid4().hex[:12]}"


def workflow_from_path(path: str | Path) -> GamePMWorkflow:
    return GamePMWorkflow(FileStore(path))
