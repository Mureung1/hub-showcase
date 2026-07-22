"""법인세비용 수렴 루프 검증. 근거: plans/PLAN-2-결산.md §4 (법인세비용↔당기순이익 순환 참조)."""

import unittest
from decimal import Decimal

from taxengine.engine.convergence import 수렴계산

D = Decimal


class 수렴계산_테스트(unittest.TestCase):
    def test_2회차에_수렴한다(self):
        r = 수렴계산(
            세전당기순이익=100_000_000, 가산조정_세전=5_000_000,
            중소기업=True, 사업연도개시일="2025-01-01",
        )
        self.assertTrue(r["수렴"])
        self.assertEqual(r["반복횟수"], 2)

    def test_각사업연도소득은_법인세비용_값과_무관하게_불변(self):
        r = 수렴계산(
            세전당기순이익=100_000_000, 가산조정_세전=5_000_000,
            중소기업=True, 사업연도개시일="2025-01-01",
        )
        회차1, 회차2 = r["회차기록"]
        self.assertNotEqual(회차1["투입법인세비용"], 회차2["투입법인세비용"])
        self.assertEqual(회차1["산출법인세비용"], 회차2["산출법인세비용"])

    def test_최종_법인세비용과_당기순이익_원단위_정합(self):
        r = 수렴계산(
            세전당기순이익=100_000_000, 가산조정_세전=5_000_000,
            중소기업=True, 사업연도개시일="2025-01-01",
        )
        self.assertEqual(r["당기순이익"], D(100_000_000) - r["법인세비용"])
        # 산출세액 9%(2025 중소, 2억 이하) × (세전순이익+가산조정_세전) = (100M+5M)*9% + 지방 0.9%
        self.assertEqual(r["법인세비용"], D(105_000_000) * D("0.099"))

    def test_이월결손금_있어도_수렴한다(self):
        r = 수렴계산(
            세전당기순이익=50_000_000, 가산조정_세전=0, 이월결손금=100_000_000,
            중소기업=True, 사업연도개시일="2025-01-01",
        )
        self.assertTrue(r["수렴"])
        self.assertEqual(r["법인세비용"], D(0))  # 이월결손금으로 과세표준 0


if __name__ == "__main__":
    unittest.main()
