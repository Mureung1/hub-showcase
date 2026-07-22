"""통합 테스트 — 종이책 CSV → 엔진 → 정답지 대조 전 과정을 고정한다.
검증기가 "항상 초록"이 아니라 실제로 오류를 잡는지(음성 케이스)도 확인한다.
"""

import unittest
from decimal import Decimal
from pathlib import Path

from taxengine.loader import parse_file
from taxengine.validate import 검증
from taxengine.pipeline import 실행
from taxengine.money import 원

# 작동 예시(정답지 포함)로 통합 재현을 검증한다. 빈 양식은 data/templates/.
TPL = Path(__file__).resolve().parent.parent / "data" / "example" / "fy2025"
D = Decimal


class 통합재현(unittest.TestCase):
    def test_예시_템플릿이_정답지와_완전히_재현된다(self):
        out = 실행(TPL)
        v, r, 정답 = out["v"], out["r"], out["정답"]
        self.assertTrue(v["ok"], "입력 무결성 통과")
        self.assertEqual(r["각사업연도소득"], 원(정답["각사업연도소득"]))
        self.assertEqual(r["과세표준"], 원(정답["과세표준"]))
        self.assertEqual(r["산출세액"], 원(정답["산출세액"]))
        self.assertEqual(r["차감납부세액"], 원(정답["차감납부세액"]))
        self.assertEqual(r["지방소득세"]["산출세액"], 원(정답["지방소득세"]))

    def test_당기순이익은_하드코딩이_아니라_계산된다(self):
        out = 실행(TPL)
        self.assertEqual(out["v"]["당기순이익"], D(157_000_000) - D(78_500_000))  # 수익 − 비용


class 검증기_음성케이스(unittest.TestCase):
    def test_대차가_안맞으면_검증기가_잡는다(self):
        정상 = parse_file(TPL / "balance_sheet.csv")
        훼손 = [{**r, "금액": "99999999"} if r["계정"] == "보통예금" else r for r in 정상]
        v = 검증(재무상태표=훼손)
        self.assertFalse(v["ok"])
        self.assertTrue(any("대차평형" in c["name"] and not c["ok"] for c in v["checks"]))

    def test_기초누계가_취득가_넘으면_잡는다(self):
        v = 검증(자산대장=[{"명": "이상자산", "취득일": "2020-01-01",
                          "취득가": "1000000", "기초누계": "2000000"}])
        self.assertFalse(v["ok"])


if __name__ == "__main__":
    unittest.main()
