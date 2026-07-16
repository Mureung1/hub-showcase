"""통합 테스트 — 종이책 CSV → 엔진 → 정답지 대조 전 과정을 고정한다.
검증기가 "항상 초록"이 아니라 실제로 오류를 잡는지(음성 케이스)도 확인한다.
"""

import unittest
from decimal import Decimal
from pathlib import Path

from taxengine.loader import parse_file, parse_key_value, 합계
from taxengine.validate import 검증
from taxengine.engine.depreciation import 시부인
from taxengine.engine.tax import 계산
from taxengine.money import 원

TPL = Path(__file__).resolve().parent.parent / "data" / "templates"
D = Decimal


def 재현(d: Path):
    회사 = parse_key_value(d / "company.csv")
    손익계산서 = parse_file(d / "income_statement.csv")
    재무상태표 = parse_file(d / "balance_sheet.csv")
    자산대장 = parse_file(d / "assets.csv")
    조정 = parse_file(d / "adjustments.csv")

    v = 검증(재무상태표=재무상태표, 손익계산서=손익계산서, 자산대장=자산대장)
    감가부인 = D(0)
    감가추인 = D(0)
    for a in 자산대장:
        s = 시부인({
            "명": a["명"], "구분": a["구분"], "취득일": a["취득일"],
            "취득가": a["취득가"], "기초누계": a["기초누계"], "회사계상액": a["회사계상액"],
            "방법": a["방법"], "내용연수": int(str(a["내용연수"]).replace(",", "")),
            "전기이월부인액": a["전기이월부인액"],
            "업무용승용차": str(a.get("업무용승용차")).lower() == "true",
        }, 회사)
        감가부인 += s["부인액"]
        감가추인 += s["추인액"]
    r = 계산({
        "당기순이익": v["당기순이익"],
        "가산조정": 합계([x for x in 조정 if x["구분"] in ("익금산입", "손금불산입")], "금액") + 감가부인,
        "차감조정": 합계([x for x in 조정 if x["구분"] in ("손금산입", "익금불산입")], "금액") + 감가추인,
        "이월결손금": 회사.get("이월결손금", 0), "기납부세액": 회사.get("기납부세액", 0),
        "중소기업": 회사.get("중소기업") is True, "사업연도개시일": 회사["사업연도개시일"],
    })
    return v, r


class 통합재현(unittest.TestCase):
    def test_예시_템플릿이_정답지와_완전히_재현된다(self):
        v, r = 재현(TPL)
        정답 = parse_key_value(TPL / "answer.csv")
        self.assertTrue(v["ok"], "입력 무결성 통과")
        self.assertEqual(r["각사업연도소득"], 원(정답["각사업연도소득"]))
        self.assertEqual(r["과세표준"], 원(정답["과세표준"]))
        self.assertEqual(r["산출세액"], 원(정답["산출세액"]))
        self.assertEqual(r["차감납부세액"], 원(정답["차감납부세액"]))
        self.assertEqual(r["지방소득세"]["산출세액"], 원(정답["지방소득세"]))

    def test_당기순이익은_하드코딩이_아니라_계산된다(self):
        v, _ = 재현(TPL)
        self.assertEqual(v["당기순이익"], D(157_000_000) - D(78_500_000))  # 수익 − 비용


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
