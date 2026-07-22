"""최저한세 검증. 근거: 조특법 §132 (중소 7% · 일반 100억 이하 10% — 2026-07-20 웹 검증)."""

import unittest
from decimal import Decimal

from taxengine.engine import amt
from taxengine.engine.tax import 계산
from taxengine.domain.rates import 최저한세율

D = Decimal


class 최저한세율_테스트(unittest.TestCase):
    def test_중소기업은_7퍼센트(self):
        self.assertEqual(최저한세율(True, D(50_000_000_000)), D("0.07"))

    def test_일반법인_100억이하는_10퍼센트(self):
        self.assertEqual(최저한세율(False, D(10_000_000_000)), D("0.10"))

    def test_일반법인_100억초과_1000억이하는_12퍼센트(self):
        self.assertEqual(최저한세율(False, D(50_000_000_000)), D("0.12"))


class 최저한세_배제_테스트(unittest.TestCase):
    def test_감면후세액이_최저한세_이상이면_배제_없음(self):
        r = amt.계산(과세표준=D(100_000_000), 산출세액=D(9_000_000), 공제감면세액=D(0), 중소기업=True)
        self.assertFalse(r["적용"])
        self.assertEqual(r["배제액"], D(0))

    def test_감면이_최저한세_아래로_깎으면_초과분만_배제(self):
        # 과세표준 10억, 일반법인 → 최저한세 10%=1억. 산출세액 1.7억 - 공제감면 0.9억 = 0.8억 < 1억
        # → 부족분 0.2억만 배제 (전액 배제 아님)
        r = amt.계산(과세표준=D(1_000_000_000), 산출세액=D(170_000_000),
                    공제감면세액=D(90_000_000), 중소기업=False)
        self.assertTrue(r["적용"])
        self.assertEqual(r["최저한세"], D(100_000_000))
        self.assertEqual(r["배제액"], D(20_000_000))
        self.assertEqual(r["적용후공제감면세액"], D(70_000_000))

    def test_공제감면세액_전액을_넘는_배제는_불가(self):
        # 최저한세가 산출세액보다도 커도, 배제는 신청한 공제감면세액을 넘지 않는다
        r = amt.계산(과세표준=D(100_000_000), 산출세액=D(9_000_000),
                    공제감면세액=D(5_000_000), 중소기업=False)
        self.assertEqual(r["배제액"], D(5_000_000))
        self.assertEqual(r["적용후공제감면세액"], D(0))


class 별지3_통합_테스트(unittest.TestCase):
    def test_최저한세가_차감납부세액을_끌어올린다(self):
        r = 계산({
            "당기순이익": 1_000_000_000, "사업연도개시일": "2025-01-01",
            "중소기업": False, "공제감면세액": 90_000_000,
        })
        self.assertEqual(r["산출세액"], D(170_000_000))
        self.assertTrue(r["최저한세"]["적용"])
        self.assertEqual(r["공제감면세액"], D(70_000_000))  # 배제 후
        self.assertEqual(r["차감납부세액"], D(100_000_000))  # 최저한세 바닥에 걸림

    def test_공제감면세액_0이면_최저한세_영향_없음(self):
        r = 계산({"당기순이익": 100_000_000, "사업연도개시일": "2025-01-01"})
        self.assertFalse(r["최저한세"]["적용"])
        self.assertEqual(r["차감납부세액"], r["산출세액"])


if __name__ == "__main__":
    unittest.main()
