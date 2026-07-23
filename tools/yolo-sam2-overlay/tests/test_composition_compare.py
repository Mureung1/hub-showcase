import unittest

import numpy as np

from src.composition_compare import compare_person_layouts, score_background_lines


class CompositionCompareTests(unittest.TestCase):
    def test_person_score_is_high_for_matching_layout(self):
        reference = [{"x": 0.35, "y": 0.3, "width": 0.2, "height": 0.5, "label": "Subject"}]
        captured = [{"x": 0.36, "y": 0.31, "width": 0.2, "height": 0.5, "label": "Subject"}]
        result = compare_person_layouts(reference, captured)
        self.assertEqual(result["status"], "ok")
        self.assertGreater(result["score"], 90)

    def test_identity_homography_keeps_registered_line_score_high(self):
        lines = [{"id": "line-1", "start": [0.2, 0.3], "end": [0.8, 0.3]}]
        result = score_background_lines(lines, np.eye(3), (1000, 800), (1000, 800))
        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["score"], 100.0)


if __name__ == "__main__":
    unittest.main()
