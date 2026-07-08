from __future__ import annotations

import unittest
from pathlib import Path


PROMPT_DIR = Path(__file__).resolve().parents[1] / "gamepm_agent" / "prompts"


class PromptQualityTests(unittest.TestCase):
    def test_all_prompts_require_json_only(self) -> None:
        for path in PROMPT_DIR.glob("*.md"):
            content = path.read_text(encoding="utf-8")
            with self.subTest(prompt=path.name):
                self.assertIn("Return JSON only", content)

    def test_prompts_preserve_json_keys_and_enums(self) -> None:
        for path in PROMPT_DIR.glob("*.md"):
            content = path.read_text(encoding="utf-8")
            with self.subTest(prompt=path.name):
                self.assertIn("JSON keys", content)

    def test_user_facing_outputs_are_korean(self) -> None:
        for prompt_name in [
            "intent_classification.md",
            "document_change_plan.md",
            "missing_field_questions.md",
            "conflict_impact_analysis.md",
        ]:
            content = (PROMPT_DIR / prompt_name).read_text(encoding="utf-8")
            with self.subTest(prompt=prompt_name):
                self.assertIn("Korean", content)
                self.assertIn("한국어", content)

    def test_safety_rules_are_present(self) -> None:
        expected = {
            "intent_classification.md": ["Classification never applies", "needs_clarification"],
            "document_change_plan.md": ["Never claim", "Do not invent facts", "Approval Queue"],
            "conflict_impact_analysis.md": ["Do not claim", "Do not invent conflicts", "confidence"],
        }
        for prompt_name, phrases in expected.items():
            content = (PROMPT_DIR / prompt_name).read_text(encoding="utf-8")
            with self.subTest(prompt=prompt_name):
                for phrase in phrases:
                    self.assertIn(phrase, content)

    def test_document_change_prompt_has_document_type_guidance(self) -> None:
        content = (PROMPT_DIR / "document_change_plan.md").read_text(encoding="utf-8")
        for document_type in [
            "`npc`",
            "`quest`",
            "`item`",
            "`system`",
            "`world_setting`",
            "`meeting_note`",
        ]:
            with self.subTest(document_type=document_type):
                self.assertIn(document_type, content)

    def test_conflict_prompt_has_conflict_categories(self) -> None:
        content = (PROMPT_DIR / "conflict_impact_analysis.md").read_text(encoding="utf-8")
        for category in [
            "Canon conflict",
            "Terminology conflict",
            "Duplicate document risk",
            "Scope conflict",
            "Implementation conflict",
        ]:
            with self.subTest(category=category):
                self.assertIn(category, content)


if __name__ == "__main__":
    unittest.main()
