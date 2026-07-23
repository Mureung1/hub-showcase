import unittest

from src.guide_comparison import compare_guides


def guide(frame, keypoints=None):
    return {
        "personFrames": [frame],
        "personPoses": [{"keypoints": keypoints or {}}],
    }


FRAME = {"x": 0.3, "y": 0.2, "width": 0.3, "height": 0.5, "label": "Subject"}
POSE = {
    "nose": [0.45, 0.28],
    "left_shoulder": [0.38, 0.37],
    "right_shoulder": [0.52, 0.37],
    "left_wrist": [0.34, 0.46],
    "left_hip": [0.39, 0.56],
    "right_hip": [0.51, 0.56],
}


class GuideComparisonTests(unittest.TestCase):
    def test_identical_guides_score_100(self):
        result = compare_guides(guide(FRAME, POSE), guide(FRAME, POSE))
        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["score"], 100.0)

    def test_person_count_mismatch_is_invalid(self):
        result = compare_guides(guide(FRAME, POSE), {"personFrames": [], "personPoses": []})
        self.assertEqual(result["status"], "invalid")
        self.assertEqual(result["score"], 0.0)

    def test_position_change_lowers_position_score(self):
        moved = {**FRAME, "x": 0.5}
        result = compare_guides(guide(FRAME, POSE), guide(moved, POSE))
        self.assertLess(result["components"]["position"]["score"], 100)

    def test_size_change_lowers_size_score(self):
        larger = {**FRAME, "width": 0.5, "height": 0.7}
        result = compare_guides(guide(FRAME, POSE), guide(larger, POSE))
        self.assertLess(result["components"]["size"]["score"], 100)

    def test_pose_change_lowers_pose_score(self):
        changed_pose = {**POSE, "left_wrist": [0.22, 0.63]}
        result = compare_guides(guide(FRAME, POSE), guide(FRAME, changed_pose))
        self.assertLess(result["components"]["pose"]["score"], 100)

    def test_missing_keypoints_add_warning_and_skip_pose_component(self):
        partial_pose = {"nose": [0.45, 0.28], "left_shoulder": [0.38, 0.37], "right_shoulder": [0.52, 0.37]}
        result = compare_guides(guide(FRAME, partial_pose), guide(FRAME, partial_pose))
        self.assertFalse(result["components"]["pose"]["available"])
        self.assertTrue(result["warnings"])


if __name__ == "__main__":
    unittest.main()
