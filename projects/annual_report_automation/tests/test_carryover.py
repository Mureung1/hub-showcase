"""연도 간 자동이월 검증.

전기(작년) 결과가 당기(올해) 기초값으로 정확히 흘러가는지, 그리고 어긋나면 잡는지.
"""

import unittest
from decimal import Decimal
from pathlib import Path

from taxengine.pipeline import 실행
from taxengine.carryover import 자산이월, 이월결손금이월, 연속성검증
from taxengine.loader import parse_file, parse_key_value

E2Y = Path(__file__).resolve().parent.parent / "data" / "example-2y"
D = Decimal
FY2024 = {"사업연도개시일": "2024-01-01", "사업연도종료일": "2024-12-31"}


class 자산이월_테스트(unittest.TestCase):
    def test_기초누계는_전기_계상액만큼_증가(self):
        전기 = {"명": "비품", "구분": "비품", "취득일": "2024-01-15", "취득가": 10_000_000,
               "기초누계": 0, "회사계상액": 3_000_000, "방법": "정액", "내용연수": 5, "전기이월부인액": 0}
        r = 자산이월(전기, FY2024)
        self.assertEqual(r["기초누계"], D(3_000_000))  # 0 + 3,000,000

    def test_유보는_전기_부인액만큼_누적(self):
        # 300만 계상 − 범위 200만 = 부인 100만 → 다음 해 전기이월부인액
        전기 = {"명": "비품", "구분": "비품", "취득일": "2024-01-15", "취득가": 10_000_000,
               "기초누계": 0, "회사계상액": 3_000_000, "방법": "정액", "내용연수": 5, "전기이월부인액": 0}
        r = 자산이월(전기, FY2024)
        self.assertEqual(r["전기이월부인액"], D(1_000_000))


class 이월결손금_테스트(unittest.TestCase):
    def test_전기가_흑자면_이월결손금_0(self):
        전기결과 = {"r": {"이월결손금공제": D(0), "각사업연도소득": D(68_000_000)}}
        self.assertEqual(이월결손금이월(전기결과, {"이월결손금": 0}), D(0))

    def test_전기가_결손이면_그만큼_이월(self):
        전기결과 = {"r": {"이월결손금공제": D(0), "각사업연도소득": D(-30_000_000)}}
        self.assertEqual(이월결손금이월(전기결과, {"이월결손금": 0}), D(30_000_000))

    def test_전기_이월결손금_중_공제된_만큼_소진(self):
        # 이월결손금 5천만 중 3천만 공제, 당기 결손 없음 → 잔여 2천만 이월
        전기결과 = {"r": {"이월결손금공제": D(30_000_000), "각사업연도소득": D(10_000_000)}}
        self.assertEqual(이월결손금이월(전기결과, {"이월결손금": 50_000_000}), D(20_000_000))


class 연속성검증_통합(unittest.TestCase):
    def test_2024에서_2025로_이월이_일치한다(self):
        전기 = 실행(E2Y / "2024")
        당기_자산 = parse_file(E2Y / "2025" / "assets.csv")
        당기_회사 = parse_key_value(E2Y / "2025" / "company.csv")
        c = 연속성검증(전기, 당기_자산, 당기_회사)
        self.assertTrue(c["ok"], [f"{x['name']}: {x['detail']}" for x in c["checks"] if not x["ok"]])

    def test_기초누계를_틀리게_넣으면_잡는다(self):
        전기 = 실행(E2Y / "2024")
        당기_자산 = parse_file(E2Y / "2025" / "assets.csv")
        당기_자산[0]["기초누계"] = "9999999"  # 오타 주입
        당기_회사 = parse_key_value(E2Y / "2025" / "company.csv")
        c = 연속성검증(전기, 당기_자산, 당기_회사)
        self.assertFalse(c["ok"])
        self.assertTrue(any("기초누계" in x["name"] and not x["ok"] for x in c["checks"]))

    def test_전기이월부인액을_누락하면_잡는다(self):
        전기 = 실행(E2Y / "2024")
        당기_자산 = parse_file(E2Y / "2025" / "assets.csv")
        당기_자산[0]["전기이월부인액"] = "0"  # 이월 누락
        당기_회사 = parse_key_value(E2Y / "2025" / "company.csv")
        c = 연속성검증(전기, 당기_자산, 당기_회사)
        self.assertFalse(c["ok"])


if __name__ == "__main__":
    unittest.main()
