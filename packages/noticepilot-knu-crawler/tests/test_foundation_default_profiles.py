from __future__ import annotations

from copy import deepcopy
from pathlib import Path
import unittest


PACKAGE_ROOT = Path(__file__).resolve().parents[1]
CONFIG_ROOT = PACKAGE_ROOT / "configs"
PROFILE_PATH = CONFIG_ROOT / "noticepilot_default_subscription_profiles.v0.1.json"
BOARD_REGISTRY_PATH = CONFIG_ROOT / "knu_board_registry.v0.2.json"
ELIGIBILITY_POLICY_PATH = CONFIG_ROOT / "noticepilot_feed_eligibility_policy.v0.2.json"


class FoundationDefaultProfilesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from noticepilot_feed_eligibility import load_feed_eligibility_policy
        from noticepilot_feed_builder import load_default_profile_collection
        from noticepilot_subscription_profile import load_canonical_board_map

        cls.board_map = load_canonical_board_map(BOARD_REGISTRY_PATH)
        cls.collection, cls.profiles = load_default_profile_collection(
            PROFILE_PATH,
            canonical_board_map=cls.board_map,
        )
        cls.policy = load_feed_eligibility_policy(ELIGIBILITY_POLICY_PATH)

    def test_authoritative_collection_contains_exactly_two_distinct_profiles(self):
        from noticepilot_feed_builder import (
            JOB_DEFAULT_PROFILE_ID,
            STUDENT_DEFAULT_PROFILE_ID,
        )

        self.assertTrue(self.collection["authoritativePolicyDefaults"])
        self.assertFalse(self.collection["userCampusDefaultEstablished"])
        self.assertEqual(len(self.profiles), 2)
        self.assertEqual(
            {profile["profileId"] for profile in self.profiles},
            {STUDENT_DEFAULT_PROFILE_ID, JOB_DEFAULT_PROFILE_ID},
        )

    def test_student_and_job_scopes_are_separate_and_all_campuses_are_explicit(self):
        from noticepilot_feed_builder import (
            JOB_DEFAULT_PROFILE_ID,
            STUDENT_DEFAULT_PROFILE_ID,
        )
        from noticepilot_subscription_profile import PHYSICAL_CAMPUSES

        profiles_by_id = {profile["profileId"]: profile for profile in self.profiles}
        student = profiles_by_id[STUDENT_DEFAULT_PROFILE_ID]
        job = profiles_by_id[JOB_DEFAULT_PROFILE_ID]

        self.assertEqual(student["institutionId"], "kangwon")
        self.assertEqual(student["timezone"], "Asia/Seoul")
        self.assertEqual(student["status"], "active")
        self.assertEqual(job["institutionId"], "kangwon")
        self.assertEqual(job["timezone"], "Asia/Seoul")
        self.assertEqual(job["status"], "active")
        self.assertEqual(student["eventSelection"]["includedFeedScopes"], ["student_default"])
        self.assertEqual(student["eventSelection"]["includedTargetActors"], ["student"])
        self.assertEqual(job["eventSelection"]["includedFeedScopes"], ["job_application"])
        self.assertEqual(job["eventSelection"]["includedTargetActors"], ["job_applicant"])

        for profile in self.profiles:
            campuses = profile["campusSelection"]["selectedCampuses"]
            self.assertEqual(len(campuses), len(set(campuses)))
            self.assertEqual(set(campuses), PHYSICAL_CAMPUSES)

    def test_boards_notice_types_and_policy_defaults_are_consistent(self):
        from noticepilot_feed_eligibility import get_default_profile_policy
        from noticepilot_feed_builder import (
            JOB_DEFAULT_PROFILE_ID,
            STUDENT_DEFAULT_PROFILE_ID,
        )

        profiles_by_id = {profile["profileId"]: profile for profile in self.profiles}
        for kind, profile_id in (
            ("student", STUDENT_DEFAULT_PROFILE_ID),
            ("job", JOB_DEFAULT_PROFILE_ID),
        ):
            profile = profiles_by_id[profile_id]
            source = profile["sourceSelection"]
            expected_notice_types = {self.board_map[board_id] for board_id in source["selectedBoardIds"]}
            self.assertEqual(set(source["selectedNoticeTypes"]), expected_notice_types)
            self.assertTrue(source["canonicalBoardsOnly"])

            policy = get_default_profile_policy(self.policy, kind)
            event = profile["eventSelection"]
            campus = profile["campusSelection"]
            self.assertEqual(campus["includeUnknownCampusEvents"], policy["includeUnknownCampusEvents"])
            self.assertEqual(event["includeReviewRequiredEvents"], policy["includeReviewRequiredEvents"])
            self.assertFalse(profile["audienceFilter"]["enabled"])
            self.assertEqual(profile["audienceFilter"]["unscopedEventPolicy"], "include")

    def test_profiles_contain_no_delivery_credentials_or_personal_data(self):
        forbidden_keys = {
            "feedtoken", "feedtokenhash", "subscriptionurl", "icsurl", "capabilityurl",
            "dsn", "databaseurl", "adminapikey", "privatekey", "email", "phone",
        }

        def visit(value):
            if isinstance(value, dict):
                for key, nested in value.items():
                    self.assertNotIn(key.lower(), forbidden_keys)
                    visit(nested)
            elif isinstance(value, list):
                for nested in value:
                    visit(nested)
            elif isinstance(value, str):
                lowered = value.lower()
                self.assertNotIn("://", lowered)
                self.assertNotIn("-----begin", lowered)

        visit(self.collection)

    def test_invalid_profile_id_campus_and_board_are_rejected_fail_closed(self):
        from noticepilot_feed_builder import FeedBuilderError, validate_default_profile_collection
        from noticepilot_subscription_profile import SubscriptionProfileValidationError

        invalid_id = deepcopy(self.collection)
        invalid_id["profiles"][0]["profileId"] = "subprof_" + "f" * 32
        with self.assertRaises((FeedBuilderError, SubscriptionProfileValidationError)):
            validate_default_profile_collection(invalid_id, canonical_board_map=self.board_map)

        invalid_campus = deepcopy(self.collection)
        invalid_campus["profiles"][0]["campusSelection"]["selectedCampuses"] = ["seoul"]
        with self.assertRaises((FeedBuilderError, SubscriptionProfileValidationError)):
            validate_default_profile_collection(invalid_campus, canonical_board_map=self.board_map)

        invalid_board = deepcopy(self.collection)
        invalid_board["profiles"][1]["sourceSelection"]["selectedBoardIds"] = ["999"]
        with self.assertRaises((FeedBuilderError, SubscriptionProfileValidationError)):
            validate_default_profile_collection(invalid_board, canonical_board_map=self.board_map)


if __name__ == "__main__":
    unittest.main()
