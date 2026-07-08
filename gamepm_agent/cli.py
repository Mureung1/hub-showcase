from __future__ import annotations

import argparse
import json
from pathlib import Path

from .agent_engine import AgentEngineError, PromptAgentEngine, RuleBasedAgentEngine
from .models import ApprovalStatus, DocumentType
from .openai_client import DEFAULT_OPENAI_MODEL, OpenAIJSONClient
from .storage import FileStore
from .workflow import GamePMWorkflow


class UnconfiguredLLMClient:
    def complete_json(self, system_prompt: str, payload: dict[str, object]) -> dict[str, object]:
        raise AgentEngineError(
            "Prompt agent selected, but no LLM client is configured for the CLI yet."
        )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="GamePM approval-first document workflow MVP")
    parser.add_argument("--store", default=".gamepm", help="Path to the file store")
    parser.add_argument("--agent", choices=["rule", "prompt"], default="rule")
    parser.add_argument("--llm", choices=["none", "openai"], default="none")
    parser.add_argument("--model", default=DEFAULT_OPENAI_MODEL)
    subparsers = parser.add_subparsers(dest="command", required=True)

    project = subparsers.add_parser("project-create")
    project.add_argument("project_id")
    project.add_argument("name")
    project.add_argument("--genre", default="")
    project.add_argument("--engine", default="")

    add_doc = subparsers.add_parser("doc-add")
    add_doc.add_argument("project_id")
    add_doc.add_argument("title")
    add_doc.add_argument("file")
    add_doc.add_argument("--type", default=DocumentType.UNKNOWN.value)

    submit = subparsers.add_parser("submit")
    submit.add_argument("project_id")
    submit.add_argument("text")
    submit.add_argument("--user", default="user")

    proposals = subparsers.add_parser("proposals")
    proposals.add_argument("project_id")

    decide = subparsers.add_parser("decide")
    decide.add_argument("project_id")
    decide.add_argument("proposal_id")
    decide.add_argument("status", choices=[
        ApprovalStatus.APPROVED.value,
        ApprovalStatus.ON_HOLD.value,
        ApprovalStatus.CHANGE_REQUESTED.value,
        ApprovalStatus.REJECTED.value,
    ])
    decide.add_argument("--user", default="user")
    decide.add_argument("--reason", default="")

    apply = subparsers.add_parser("apply")
    apply.add_argument("project_id")
    apply.add_argument("proposal_id")

    diff = subparsers.add_parser("diff")
    diff.add_argument("project_id")
    diff.add_argument("proposal_id")

    docs = subparsers.add_parser("docs")
    docs.add_argument("project_id")

    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    engine = build_engine(args)
    workflow = GamePMWorkflow(FileStore(args.store), agent_engine=engine)

    if args.command == "project-create":
        result = workflow.create_project(
            args.project_id,
            args.name,
            genre=args.genre,
            engine=args.engine,
        ).to_dict()
    elif args.command == "doc-add":
        result = workflow.add_document(
            project_id=args.project_id,
            title=args.title,
            content=Path(args.file).read_text(encoding="utf-8"),
            document_type=DocumentType(args.type),
        ).to_dict()
    elif args.command == "submit":
        result = workflow.submit_input(args.project_id, args.text, requested_by=args.user)
    elif args.command == "proposals":
        result = [proposal.to_dict() for proposal in workflow.list_proposals(args.project_id)]
    elif args.command == "decide":
        result = workflow.decide_proposal(
            project_id=args.project_id,
            proposal_id=args.proposal_id,
            status=ApprovalStatus(args.status),
            decided_by=args.user,
            reason=args.reason,
        ).to_dict()
    elif args.command == "apply":
        result = workflow.apply_approved_proposal(args.project_id, args.proposal_id).to_dict()
    elif args.command == "diff":
        print(workflow.diff_for_proposal(args.project_id, args.proposal_id), end="")
        return 0
    elif args.command == "docs":
        result = [document.to_dict() for document in workflow.list_documents(args.project_id)]
    else:
        raise AssertionError(args.command)

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


def build_engine(args: argparse.Namespace) -> RuleBasedAgentEngine | PromptAgentEngine:
    if args.agent == "rule":
        return RuleBasedAgentEngine()
    if args.llm == "openai":
        return PromptAgentEngine(OpenAIJSONClient(model=args.model))
    return PromptAgentEngine(UnconfiguredLLMClient())


if __name__ == "__main__":
    raise SystemExit(main())
