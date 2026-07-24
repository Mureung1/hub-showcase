from __future__ import annotations

import importlib
import json
import tempfile
import unittest
from pathlib import Path


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
    def _profile(self):
        return {
            "schemaVersion": "noticepilot.subscriptionProfile.v0.1",
            "profileId": "subprof_" + "a" * 32,
            "profileRevision": 1,
            "institutionId": "kangwon",
            "displayName": "Synthetic student profile",
            "calendarName": "Synthetic calendar",
            "timezone": "Asia/Seoul",
            "status": "active",
            "campusSelection": {
                "selectedCampuses": ["chuncheon"],
                "includeAllCampusEvents": True,
                "includeUnknownCampusEvents": False,
                "matchingMode": "intersects",
            },
            "sourceSelection": {
                "selectedBoardIds": ["504"],
                "selectedNoticeTypes": ["general_notice"],
                "canonicalBoardsOnly": True,
                "matchingMode": "all_dimensions",
            },
            "eventSelection": {
                "includedFeedScopes": ["student_default"],
                "includedEventTypes": ["deadline"],
                "includedTargetActors": ["student"],
                "includeReviewRequiredEvents": False,
                "matchingMode": "all_dimensions",
            },
            "audienceFilter": {
                "enabled": False,
                "degreeLevels": [],
                "studentYears": [],
                "enrollmentStatuses": [],
                "admissionTypes": [],
                "matchMode": "all_dimensions",
                "unscopedEventPolicy": "include",
            },
            "createdAt": "2030-01-01T00:00:00+00:00",
            "updatedAt": "2030-01-01T00:00:00+00:00",
        }

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

    def test_synthetic_board_config_and_profile_are_strictly_validated(self):
        from noticepilot_subscription_profile import (
            SubscriptionProfileValidationError,
            load_canonical_board_map,
            validate_subscription_profile,
        )

        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "boards.json"
            path.write_text(json.dumps([{
                "boardId": "504", "category": "general_notice", "canonical": True,
            }]), encoding="utf-8")
            board_map = load_canonical_board_map(path)
        profile = self._profile()
        self.assertEqual(validate_subscription_profile(profile, canonical_board_map=board_map), profile)
        profile["sourceSelection"]["selectedNoticeTypes"] = ["event"]
        with self.assertRaises(SubscriptionProfileValidationError):
            validate_subscription_profile(profile, canonical_board_map=board_map)

    def test_hash_and_structure_validators_are_deterministic_and_fail_closed(self):
        from noticepilot_calendar_event_registry import (
            CalendarEventRegistryError,
            validate_registry_artifacts,
        )
        from noticepilot_feed_snapshot import (
            FeedSnapshotError,
            canonical_sha256,
            validate_feed_snapshot,
        )

        self.assertEqual(canonical_sha256({"a": 1, "b": [2]}), canonical_sha256({"b": [2], "a": 1}))
        self.assertNotEqual(canonical_sha256({"a": 1}), canonical_sha256({"a": 2}))
        with self.assertRaises(FeedSnapshotError):
            validate_feed_snapshot({})
        with self.assertRaises(CalendarEventRegistryError):
            validate_registry_artifacts({})


if __name__ == "__main__":
    unittest.main()
