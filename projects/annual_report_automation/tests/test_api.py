"""API 엔드포인트 검증.

data/example/fy2025 실데이터를 JSON 페이로드로 그대로 넣어서(수기로 옮겨 적음 — CSV 자체를
읽지 않는다, API 계약은 CSV 콤마 문자열이 아니라 JSON 네이티브 타입이어야 하므로) "회사 생성 →
사업연도 생성 → 계산 → 이력 조회"가 한 바퀴 돌고, cli/reproduce.py가 검증한 것과 같은 정답지
숫자(차감납부세액 8,575,599 등)가 나오는지 확인한다.
"""

import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from taxengine.api.main import app, get_conn
from taxengine.db.migrate import db_열기

# data/example/fy2025를 JSON 페이로드로 옮겨 적은 것 — 정답지는 cli/reproduce.py가 검증한 값과 같다.
FY2025_페이로드 = {
    "회사": {
        "사업연도개시일": "2025-01-01", "사업연도종료일": "2025-12-31",
        "중소기업": True, "부동산임대업주업": True, "상시근로자수": 1,
        "지배주주지분율": 100, "기납부세액": 140000, "이월결손금": 0,
        "공제감면세액": 0, "가산세": 0, "기부금한도초과": 0,
        "수입금액": 156000000, "기업업무추진비_증빙불비금액": 500000,
    },
    "손익계산서": [
        {"계정": "임대료수입", "구분": "수익", "금액": 156000000},
        {"계정": "이자수익", "구분": "수익", "금액": 1000000},
        {"계정": "급여", "구분": "비용", "금액": 30000000},
        {"계정": "감가상각비", "구분": "비용", "금액": 25100000},
        {"계정": "세금과공과", "구분": "비용", "금액": 3700000},
        {"계정": "기업업무추진비", "구분": "비용", "금액": 5000000},
        {"계정": "이자비용", "구분": "비용", "금액": 6000000},
        {"계정": "법인세비용", "구분": "비용", "금액": 8700000},
    ],
    "재무상태표": [
        {"계정": "보통예금", "구분": "자산", "금액": 50000000},
        {"계정": "건물", "구분": "자산", "금액": 500000000},
        {"계정": "감가상각누계액(건물)", "구분": "자산차감", "금액": 112500000},
        {"계정": "토지", "구분": "자산", "금액": 300000000},
        {"계정": "차량운반구", "구분": "자산", "금액": 60000000},
        {"계정": "감가상각누계액(차량)", "구분": "자산차감", "금액": 24000000},
        {"계정": "임대보증금", "구분": "부채", "금액": 100000000},
        {"계정": "장기차입금", "구분": "부채", "금액": 200000000},
        {"계정": "자본금", "구분": "자본", "금액": 100000000},
        {"계정": "이익잉여금", "구분": "자본", "금액": 373500000},
    ],
    "자산대장": [
        {"명": "건물", "구분": "건축물", "취득일": "2017-01-10", "취득가": 500000000,
         "기초누계": 100000000, "회사계상액": 12500000, "방법": "정액", "내용연수": 40,
         "전기이월부인액": 0, "업무용승용차": False},
        {"명": "승용차", "구분": "차량운반구", "취득일": "2024-01-05", "취득가": 60000000,
         "기초누계": 12000000, "회사계상액": 12000000, "방법": "정액", "내용연수": 5,
         "전기이월부인액": 0, "업무용승용차": True},
        {"명": "비품", "구분": "비품", "취득일": "2025-01-15", "취득가": 10000000,
         "기초누계": 0, "회사계상액": 2000000, "방법": "정액", "내용연수": 5,
         "전기이월부인액": 0, "업무용승용차": False},
    ],
    "조정": [
        {"과목": "법인세비용", "구분": "손금불산입", "금액": 8700000,
         "소득처분": "기타사외유출", "근거": "법인세법 §21"},
        {"과목": "세금과공과(과태료)", "구분": "손금불산입", "금액": 200000,
         "소득처분": "기타사외유출", "근거": "법인세법 §21 벌금·과태료"},
        {"과목": "업무용승용차(업무외)", "구분": "손금불산입", "금액": 3339999,
         "소득처분": "상여", "근거": "법인세법 §27의2"},
        {"과목": "업무용승용차(감가한도초과)", "구분": "손금불산입", "금액": 5600000,
         "소득처분": "유보", "근거": "법인세법 §27의2 소규모법인 400만 한도"},
    ],
    "정답": {
        "각사업연도소득": 96839999, "과세표준": 96839999, "산출세액": 8715599,
        "차감납부세액": 8575599, "지방소득세": 871559,
    },
}


class API_테스트(unittest.TestCase):
    def setUp(self):
        self._tmpdir = tempfile.TemporaryDirectory()
        db_path = Path(self._tmpdir.name) / "test.db"

        def _override():
            conn = db_열기(db_path)
            try:
                yield conn
            finally:
                conn.close()

        app.dependency_overrides[get_conn] = _override
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        self._tmpdir.cleanup()

    def test_상태확인(self):
        r = self.client.get("/health")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), {"status": "ok"})

    def test_회사_생성_후_목록에_보인다(self):
        r = self.client.post("/companies", json={"회사명": "API테스트회사"})
        self.assertEqual(r.status_code, 201)
        회사id = r.json()["id"]

        목록 = self.client.get("/companies").json()
        self.assertIn(회사id, [c["id"] for c in 목록])

    def test_없는_회사에_사업연도_만들면_404(self):
        r = self.client.post("/companies/999/fiscal-years", json=FY2025_페이로드)
        self.assertEqual(r.status_code, 404)

    def test_대차가_안맞는_사업연도는_422로_거부된다(self):
        회사id = self.client.post("/companies", json={"회사명": "검증실패회사"}).json()["id"]
        깨진_페이로드 = {
            **FY2025_페이로드,
            "재무상태표": [{"계정": "보통예금", "구분": "자산", "금액": 999}],
        }
        r = self.client.post(f"/companies/{회사id}/fiscal-years", json=깨진_페이로드)
        self.assertEqual(r.status_code, 422)
        # 롤백 확인 — 사업연도가 안 남아야 한다
        self.assertEqual(self.client.get(f"/companies/{회사id}/fiscal-years").json(), [])

    def test_전체_흐름_생성_계산_이력조회(self):
        회사id = self.client.post("/companies", json={"회사명": "흐름테스트회사"}).json()["id"]

        생성 = self.client.post(f"/companies/{회사id}/fiscal-years", json=FY2025_페이로드)
        self.assertEqual(생성.status_code, 201)
        사업연도id = 생성.json()["id"]
        self.assertIsNone(생성.json()["전기사업연도id"])

        상세 = self.client.get(f"/fiscal-years/{사업연도id}")
        self.assertEqual(상세.status_code, 200)
        self.assertEqual(len(상세.json()["자산대장"]), 3)

        계산 = self.client.post(f"/fiscal-years/{사업연도id}/calculate")
        self.assertEqual(계산.status_code, 200)
        결과 = 계산.json()
        self.assertEqual(결과["각사업연도소득"], 96_839_999)
        self.assertEqual(결과["과세표준"], 96_839_999)
        self.assertEqual(결과["차감납부세액"], 8_575_599)

        스냅샷들 = self.client.get(f"/fiscal-years/{사업연도id}/snapshots").json()
        self.assertEqual(len(스냅샷들), 1)
        self.assertEqual(스냅샷들[0]["차감납부세액"], 8_575_599)
        self.assertEqual(스냅샷들[0]["id"], 결과["스냅샷id"])

        # 두 번째 계산 — append-only이므로 스냅샷이 하나 더 늘어야 한다
        self.client.post(f"/fiscal-years/{사업연도id}/calculate")
        self.assertEqual(len(self.client.get(f"/fiscal-years/{사업연도id}/snapshots").json()), 2)

    def test_없는_사업연도_계산하면_404(self):
        r = self.client.post("/fiscal-years/999/calculate")
        self.assertEqual(r.status_code, 404)


if __name__ == "__main__":
    unittest.main()
