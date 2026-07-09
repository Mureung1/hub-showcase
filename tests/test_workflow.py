from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from gamepm_agent.agent_engine import PromptAgentEngine, StaticJSONClient
from gamepm_agent.models import ApprovalStatus, DocumentType, IntentType, ProposalIntent
from gamepm_agent.storage import FileStore
from gamepm_agent.workflow import GamePMWorkflow


class WorkflowTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.workflow = GamePMWorkflow(FileStore(Path(self.tmp.name) / ".gamepm"))
        self.workflow.create_project("project-a", "Project A")
        self.workflow.create_project("project-b", "Project B")

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_temporary_idea_does_not_create_document(self) -> None:
        result = self.workflow.submit_input("project-a", "NPC가 비밀을 가진 설정이면 좋겠다")

        self.assertEqual(result["intent"]["intent"], IntentType.TEMPORARY_IDEA.value)
        self.assertEqual(self.workflow.list_documents("project-a"), [])
        self.assertEqual(len(self.workflow.store.load_ideas("project-a")), 1)

    def test_change_request_creates_pending_proposal_not_document(self) -> None:
        result = self.workflow.submit_input(
            "project-a",
            "새 NPC 문서로 만들어줘. 이름은 Rina이고 역할은 guide다.",
        )

        proposal = result["proposal"]
        self.assertEqual(proposal["status"], ApprovalStatus.PENDING.value)
        self.assertEqual(proposal["intent"], ProposalIntent.CREATE_DOCUMENT.value)
        self.assertEqual(self.workflow.list_documents("project-a"), [])

    def test_approved_create_proposal_saves_document_and_history(self) -> None:
        result = self.workflow.submit_input(
            "project-a",
            "새 Item 문서로 만들어줘. item_name: Sun Key category: key acquisition: boss drop effect: opens gate balance_value: unique",
        )
        proposal_id = result["proposal"]["proposal_id"]

        self.workflow.decide_proposal(
            "project-a",
            proposal_id,
            ApprovalStatus.APPROVED,
            decided_by="pm",
            reason="Looks good",
        )
        applied = self.workflow.apply_approved_proposal("project-a", proposal_id)

        self.assertEqual(applied.status, ApprovalStatus.APPLIED)
        self.assertEqual(len(self.workflow.list_documents("project-a")), 1)
        self.assertEqual(len(self.workflow.store.load_versions("project-a")), 1)
        self.assertEqual(len(self.workflow.store.load_decisions("project-a")), 1)

    def test_update_proposal_requires_reconfirmation_when_base_version_changed(self) -> None:
        document = self.workflow.add_document(
            "project-a",
            "Combat System",
            "# Combat System\n\nRules about stamina.\n",
            DocumentType.SYSTEM,
        )
        result = self.workflow.submit_input(
            "project-a",
            "Combat System 문서를 수정해줘. stamina 회복 규칙을 추가해줘.",
        )
        proposal_id = result["proposal"]["proposal_id"]
        self.workflow.store.save_document(
            project_id="project-a",
            title="Combat System",
            document_type=DocumentType.SYSTEM,
            content="# Combat System\n\nRules about stamina.\n\nManual edit before approval.\n",
            document_id=document.document_id,
        )
        self.workflow.decide_proposal(
            "project-a",
            proposal_id,
            ApprovalStatus.APPROVED,
            decided_by="pm",
        )

        applied = self.workflow.apply_approved_proposal("project-a", proposal_id)

        self.assertEqual(applied.status, ApprovalStatus.NEEDS_RECONFIRMATION)
        current = self.workflow.store.read_document_content("project-a", document.document_id)
        self.assertIn("Manual edit before approval", current)

    def test_search_is_limited_to_project_id(self) -> None:
        self.workflow.add_document(
            "project-a",
            "A World",
            "# A World\n\nThe moon city is called Selene.\n",
            DocumentType.WORLD_SETTING,
        )
        self.workflow.add_document(
            "project-b",
            "B World",
            "# B World\n\nThe moon city is called Other.\n",
            DocumentType.WORLD_SETTING,
        )

        results = self.workflow.search_documents("project-a", "moon city Selene")

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].document.project_id, "project-a")
        self.assertEqual(results[0].document.title, "A World")

    def test_decision_status_restrictions(self) -> None:
        result = self.workflow.submit_input("project-a", "Quest 문서를 만들어줘. quest_name: Start")
        proposal_id = result["proposal"]["proposal_id"]

        self.workflow.decide_proposal(
            "project-a",
            proposal_id,
            ApprovalStatus.REJECTED,
            decided_by="pm",
        )

        with self.assertRaises(ValueError):
            self.workflow.apply_approved_proposal("project-a", proposal_id)


class PromptAgentWorkflowTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_prompt_agent_creates_structured_proposal(self) -> None:
        client = StaticJSONClient(
            [
                {
                    "intent": "change_request",
                    "confidence": 0.93,
                    "reason": "User asked to create a document.",
                },
                {
                    "intent": "create_document",
                    "target_document_id": None,
                    "title": "Rina NPC",
                    "document_type": "npc",
                    "summary": "Create Rina NPC document.",
                    "after": "# Rina NPC\n\nname: Rina\nrole: guide\n",
                    "risk_level": "medium",
                    "missing_required_fields": ["location"],
                    "impact_scope": ["new_document"],
                    "sources": [
                        {
                            "title": "User Input",
                            "path": "chat",
                            "version": "placeholder",
                            "location": "submitted_text",
                        }
                    ],
                },
                {
                    "questions": [
                        {
                            "field": "location",
                            "question": "Where does Rina appear?",
                            "reason": "NPC documents require an appearance location.",
                        }
                    ]
                },
                {
                    "conflicts": [],
                    "impact_scope": ["new_document"],
                    "confidence": 0.7,
                    "recommendation": "Review missing location before approval.",
                },
            ]
        )
        workflow = GamePMWorkflow(
            FileStore(Path(self.tmp.name) / ".gamepm"),
            agent_engine=PromptAgentEngine(client),
        )
        workflow.create_project("project-a", "Project A")

        result = workflow.submit_input("project-a", "Rina NPC 문서를 만들어줘")

        proposal = result["proposal"]
        self.assertEqual(proposal["created_by_agent"], "prompt-agent")
        self.assertEqual(proposal["title"], "Rina NPC")
        self.assertEqual(proposal["missing_required_fields"], ["location"])
        self.assertEqual(proposal["missing_field_questions"][0]["field"], "location")
        self.assertEqual(proposal["conflict_report"]["confidence"], 0.7)
        self.assertEqual(len(workflow.list_proposals("project-a")), 1)

    def test_prompt_agent_invalid_change_response_does_not_queue_proposal(self) -> None:
        client = StaticJSONClient(
            [
                {
                    "intent": "change_request",
                    "confidence": 0.93,
                    "reason": "User asked to create a document.",
                },
                {
                    "intent": "create_document",
                    "title": "Broken response",
                },
            ]
        )
        workflow = GamePMWorkflow(
            FileStore(Path(self.tmp.name) / ".gamepm"),
            agent_engine=PromptAgentEngine(client),
        )
        workflow.create_project("project-a", "Project A")

        result = workflow.submit_input("project-a", "NPC 문서를 만들어줘")

        self.assertIn("error", result)
        self.assertEqual(workflow.list_proposals("project-a"), [])

    def test_prompt_agent_update_keeps_reconfirmation_policy(self) -> None:
        setup_workflow = GamePMWorkflow(FileStore(Path(self.tmp.name) / ".gamepm"))
        setup_workflow.create_project("project-a", "Project A")
        document = setup_workflow.add_document(
            "project-a",
            "Combat System",
            "# Combat System\n\nrules: old\n",
            DocumentType.SYSTEM,
        )
        original_version = document.version
        client = StaticJSONClient(
            [
                {
                    "intent": "change_request",
                    "confidence": 0.95,
                    "reason": "User asked to update a document.",
                },
                {
                    "intent": "update_document",
                    "target_document_id": document.document_id,
                    "title": "Combat System",
                    "document_type": "system",
                    "summary": "Update combat rules.",
                    "after": "# Combat System\n\nrules: updated\n",
                    "risk_level": "low",
                    "missing_required_fields": [],
                    "impact_scope": [document.document_id],
                    "sources": [
                        {
                            "title": "Combat System",
                            "path": document.path,
                            "version": original_version,
                            "location": "search_result",
                        }
                    ],
                },
                {"questions": []},
                {
                    "conflicts": [],
                    "impact_scope": [document.document_id],
                    "confidence": 0.8,
                    "recommendation": "Review diff.",
                },
            ]
        )
        workflow = GamePMWorkflow(
            FileStore(Path(self.tmp.name) / ".gamepm"),
            agent_engine=PromptAgentEngine(client),
        )
        result = workflow.submit_input("project-a", "Combat System 문서를 수정해줘")
        proposal_id = result["proposal"]["proposal_id"]
        workflow.store.save_document(
            project_id="project-a",
            title="Combat System",
            document_type=DocumentType.SYSTEM,
            content="# Combat System\n\nrules: manually changed\n",
            document_id=document.document_id,
        )
        workflow.decide_proposal("project-a", proposal_id, ApprovalStatus.APPROVED, "pm")

        applied = workflow.apply_approved_proposal("project-a", proposal_id)

        self.assertEqual(applied.status, ApprovalStatus.NEEDS_RECONFIRMATION)


if __name__ == "__main__":
    unittest.main()
