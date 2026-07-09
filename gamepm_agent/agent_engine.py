from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

from .models import (
    DocumentType,
    IntentResult,
    IntentType,
    ProposalIntent,
    RiskLevel,
    SearchResult,
    Source,
)
from .rules import (
    build_markdown_draft,
    classify_intent,
    default_title,
    infer_document_type,
    missing_required_fields,
)


class AgentEngineError(ValueError):
    pass


@dataclass
class ChangeProposalDraft:
    intent: ProposalIntent
    title: str
    summary: str
    after: str
    document_type: DocumentType
    risk_level: RiskLevel
    missing_required_fields: list[str]
    impact_scope: list[str]
    sources: list[Source]
    target_document_id: str | None = None


class AgentEngine(Protocol):
    name: str

    def classify_intent(self, text: str, project_context: dict[str, object]) -> IntentResult:
        ...

    def plan_document_change(
        self,
        text: str,
        project_context: dict[str, object],
        search_results: list[SearchResult],
        input_source: Source,
    ) -> ChangeProposalDraft:
        ...

    def generate_missing_field_questions(
        self,
        document_type: DocumentType,
        draft: str,
        missing_fields: list[str],
    ) -> list[dict[str, str]]:
        ...

    def analyze_conflict_and_impact(
        self,
        text: str,
        search_results: list[SearchResult],
    ) -> dict[str, object]:
        ...


class RuleBasedAgentEngine:
    name = "rules-agent"

    def classify_intent(self, text: str, project_context: dict[str, object]) -> IntentResult:
        return classify_intent(text)

    def plan_document_change(
        self,
        text: str,
        project_context: dict[str, object],
        search_results: list[SearchResult],
        input_source: Source,
    ) -> ChangeProposalDraft:
        document_type = infer_document_type(text)
        title = default_title(text, document_type)
        best_match = search_results[0] if search_results else None
        should_update = best_match is not None and best_match.score >= 0.15
        sources = [input_source]

        if should_update:
            document = best_match.document
            title = document.title
            document_type = document.document_type
            sources.append(document.source("matched_by_keyword_search"))
            before = str(project_context.get("target_document_content", ""))
            after = before.rstrip() + "\n\n## Proposed Change\n\n" + text.strip() + "\n"
            intent = ProposalIntent.UPDATE_DOCUMENT
            target_document_id = document.document_id
            impact_scope = [document.document_id]
        else:
            after = build_markdown_draft(title, document_type, text)
            intent = ProposalIntent.CREATE_DOCUMENT
            target_document_id = None
            impact_scope = ["new_document"]

        missing = missing_required_fields(document_type, after)
        risk = RiskLevel.MEDIUM if missing else RiskLevel.LOW
        return ChangeProposalDraft(
            intent=intent,
            target_document_id=target_document_id,
            title=title,
            summary=self._summary_for(intent, title, missing),
            after=after,
            document_type=document_type,
            risk_level=risk,
            missing_required_fields=missing,
            impact_scope=impact_scope,
            sources=sources,
        )

    def generate_missing_field_questions(
        self,
        document_type: DocumentType,
        draft: str,
        missing_fields: list[str],
    ) -> list[dict[str, str]]:
        return [
            {
                "field": field_name,
                "question": f"What should be used for {field_name}?",
                "reason": f"{field_name} is required for {document_type.value} documents.",
            }
            for field_name in missing_fields
        ]

    def analyze_conflict_and_impact(
        self,
        text: str,
        search_results: list[SearchResult],
    ) -> dict[str, object]:
        return {
            "conflicts": [],
            "impact_scope": [result.document.document_id for result in search_results],
            "confidence": 0.5 if search_results else 0.25,
            "recommendation": "Review the generated proposal before approval.",
        }

    def _summary_for(
        self,
        intent: ProposalIntent,
        title: str,
        missing: list[str],
    ) -> str:
        action = "Update existing document" if intent == ProposalIntent.UPDATE_DOCUMENT else "Create new document"
        suffix = f" Missing required fields: {', '.join(missing)}." if missing else ""
        return f"{action}: {title}.{suffix}"


class LLMClient(Protocol):
    def complete_json(self, system_prompt: str, payload: dict[str, object]) -> dict[str, object]:
        ...


class PromptAgentEngine:
    name = "prompt-agent"

    def __init__(self, client: LLMClient, prompt_dir: str | Path | None = None) -> None:
        self.client = client
        self.prompt_dir = Path(prompt_dir) if prompt_dir else Path(__file__).parent / "prompts"

    def classify_intent(self, text: str, project_context: dict[str, object]) -> IntentResult:
        payload = {
            "input": text,
            "project_context": project_context,
        }
        data = self._complete("intent_classification.md", payload)
        try:
            return IntentResult(
                intent=IntentType(str(data["intent"])),
                confidence=float(data["confidence"]),
                reason=str(data["reason"]),
            )
        except (KeyError, TypeError, ValueError) as exc:
            raise AgentEngineError(f"Invalid intent classification response: {data}") from exc

    def plan_document_change(
        self,
        text: str,
        project_context: dict[str, object],
        search_results: list[SearchResult],
        input_source: Source,
    ) -> ChangeProposalDraft:
        payload = {
            "input": text,
            "project_context": project_context,
            "search_results": [self._search_result_payload(result) for result in search_results],
            "input_source": input_source.to_dict(),
        }
        data = self._complete("document_change_plan.md", payload)
        try:
            sources = [Source.from_dict(source) for source in data.get("sources", [])]
            if not sources:
                raise AgentEngineError("Prompt response must include at least one source.")
            if not any(source.path == input_source.path and source.version == input_source.version for source in sources):
                sources.insert(0, input_source)
            return ChangeProposalDraft(
                intent=ProposalIntent(str(data["intent"])),
                target_document_id=data.get("target_document_id") or None,
                title=str(data["title"]),
                summary=str(data["summary"]),
                after=str(data["after"]),
                document_type=DocumentType(str(data["document_type"])),
                risk_level=RiskLevel(str(data["risk_level"])),
                missing_required_fields=[str(item) for item in data.get("missing_required_fields", [])],
                impact_scope=[str(item) for item in data.get("impact_scope", [])],
                sources=sources,
            )
        except (KeyError, TypeError, ValueError) as exc:
            raise AgentEngineError(f"Invalid document change response: {data}") from exc

    def generate_missing_field_questions(
        self,
        document_type: DocumentType,
        draft: str,
        missing_fields: list[str],
    ) -> list[dict[str, str]]:
        payload = {
            "document_type": document_type.value,
            "draft": draft,
            "missing_fields": missing_fields,
        }
        data = self._complete("missing_field_questions.md", payload)
        questions = data.get("questions", [])
        if not isinstance(questions, list):
            raise AgentEngineError(f"Invalid missing field response: {data}")
        return [
            {
                "field": str(item.get("field", "")),
                "question": str(item.get("question", "")),
                "reason": str(item.get("reason", "")),
            }
            for item in questions
            if isinstance(item, dict)
        ]

    def analyze_conflict_and_impact(
        self,
        text: str,
        search_results: list[SearchResult],
    ) -> dict[str, object]:
        payload = {
            "input": text,
            "search_results": [self._search_result_payload(result) for result in search_results],
        }
        return self._complete("conflict_impact_analysis.md", payload)

    def _complete(self, prompt_name: str, payload: dict[str, object]) -> dict[str, object]:
        prompt = (self.prompt_dir / prompt_name).read_text(encoding="utf-8")
        data = self.client.complete_json(prompt, payload)
        if not isinstance(data, dict):
            raise AgentEngineError(f"LLM client returned non-object JSON: {data!r}")
        return data

    def _search_result_payload(self, result: SearchResult) -> dict[str, object]:
        return {
            "document": result.document.to_dict(),
            "score": result.score,
            "excerpt": result.excerpt,
            "source": result.document.source("search_result").to_dict(),
        }


class StaticJSONClient:
    def __init__(self, responses: list[dict[str, object] | str]) -> None:
        self.responses = list(responses)
        self.calls: list[dict[str, object]] = []

    def complete_json(self, system_prompt: str, payload: dict[str, object]) -> dict[str, object]:
        self.calls.append({"system_prompt": system_prompt, "payload": payload})
        if not self.responses:
            raise AgentEngineError("No static JSON response configured.")
        response = self.responses.pop(0)
        if isinstance(response, str):
            try:
                parsed = json.loads(response)
            except json.JSONDecodeError as exc:
                raise AgentEngineError("Static response is not valid JSON.") from exc
            if not isinstance(parsed, dict):
                raise AgentEngineError("Static response must decode to a JSON object.")
            return parsed
        return response
