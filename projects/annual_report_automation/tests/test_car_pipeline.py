"""cars.csv → pipeline.실행() 배선 검증. 합성 데모 데이터 사용(fixtures/car-demo) —
실제 차량 데이터가 아직 없어 engine/car.py 배선 자체만 확인한다 (PLAN.md B1/데이터 갭 참고).
"""

import unittest
from decimal import Decimal
from pathlib import Path

from taxengine.pipeline import 실행

FIXTURE = Path(__file__).resolve().parent / "fixtures" / "car-demo"
D = Decimal


class 승용차_파이프라인_테스트(unittest.TestCase):
    def test_차량_손금불산입이_가산조정에_반영된다(self):
        out = 실행(FIXTURE)
        # 차량1: 감가상각비 1200만(한도 800만 → 초과 400만) + 기타비용 200만(업무비율 100%, 전액 인정)
        self.assertEqual(out["차량손금불산입"], D(4_000_000))
        self.assertEqual(len(out["차량판정들"]), 1)
        self.assertIn(D(4_000_000), [out["가산조정"]])  # 조정·감가부인·추진비 없음 → 차량분이 곧 가산조정 전체

    def test_각사업연도소득에_차량_한도초과가_반영된다(self):
        out = 실행(FIXTURE)
        self.assertEqual(out["v"]["당기순이익"], D(150_000_000))  # 200M - 50M
        self.assertEqual(out["r"]["각사업연도소득"], D(154_000_000))  # 150M + 400만

    def test_cars_csv_없는_폴더는_기존과_동일하게_동작(self):
        from taxengine.pipeline import 실행 as run
        out = run(Path(__file__).resolve().parent.parent / "data" / "example" / "fy2025")
        self.assertEqual(out["차량손금불산입"], D(0))
        self.assertEqual(out["차량판정들"], [])


if __name__ == "__main__":
    unittest.main()
