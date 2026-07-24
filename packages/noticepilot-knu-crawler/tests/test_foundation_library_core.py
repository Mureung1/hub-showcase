from __future__ import annotations

import importlib
import unittest


CORE_MODULES = (
    "noticepilot_calendar_event_registry",
    "noticepilot_calendar_event_source_link",
    "noticepilot_cross_notice_diagnostics",
    "noticepilot_feed_builder",
    "noticepilot_feed_eligibility",
    "noticepilot_feed_snapshot",
    "noticepilot_reconciliation_candidate_view",
    "noticepilot_registry_ics_projector",
    "noticepilot_subscription_profile",
)


class FoundationLibraryCoreTests(unittest.TestCase):
    def test_library_modules_import_without_reference_inputs(self):
        for module_name in CORE_MODULES:
            with self.subTest(module_name=module_name):
                importlib.import_module(module_name)

    def test_source_link_contract_copies_identity_and_rejects_invalid_role(self):
        from noticepilot_calendar_event_source_link import (
            CalendarEventSourceLinkError,
            build_source_link_draft,
            persist_source_link,
        )

        view = {
            "sourceNoticeId": "synthetic-notice-1",
            "candidateId": "synthetic-candidate-1",
            "publishedAt": "2030-01-01",
            "sourceIdentity": {
                "observedSourceUrl": "https://example.test/notices/1",
                "canonicalSourceUrl": "https://example.test/notices/1",
            },
        }
        draft = build_source_link_draft(
            view,
            relation_role="canonical",
            canonical=True,
            evidence_pair_ids=["pair-b", "pair-a", "pair-a"],
        )
        persisted = persist_source_link(
            draft,
            source_link_id="source-link-1",
            calendar_event_id="event-1",
            first_observed_at="2030-01-01T00:00:00+00:00",
        )
        self.assertEqual(persisted["evidencePairIds"], ["pair-a", "pair-b"])
        self.assertEqual(persisted["canonicalSourceUrl"], view["sourceIdentity"]["canonicalSourceUrl"])
        with self.assertRaises(CalendarEventSourceLinkError):
            build_source_link_draft(view, relation_role="duplicate_source", canonical=True)


if __name__ == "__main__":
    unittest.main()
