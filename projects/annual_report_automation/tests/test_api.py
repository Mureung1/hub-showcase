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

from taxengine.api.auth import 현재사용자
from taxengine.api.main import app, get_conn
from taxengine.db.migrate import db_열기, 사용자_확보

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
        self._db_path = Path(self._tmpdir.name) / "test.db"

        def _override():
            conn = db_열기(self._db_path)
            try:
                yield conn
            finally:
                conn.close()

        # 인증은 통째로 가짜 사용자로 override한다 — JWT 검증 자체는 auth.py의 몫이고,
        # 여기서는 "엔드포인트가 사용자 기준으로 스코핑되는가"만 본다.
        # 스코핑이 회사_사용자 FK로 실제 사용자 행을 참조하므로 행을 먼저 만들어 둔다.
        self._사용자 = {"id": self._사용자_생성("tester@example.com"), "이메일": "tester@example.com", "auth_uid": "uid-tester"}
        app.dependency_overrides[get_conn] = _override
        app.dependency_overrides[현재사용자] = lambda: self._사용자  # self._사용자를 바꾸면 즉시 전환
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        self._tmpdir.cleanup()

    def _사용자_생성(self, 이메일: str) -> int:
        conn = db_열기(self._db_path)
        try:
            사용자id = 사용자_확보(conn, 이메일)
            conn.commit()
            return 사용자id
        finally:
            conn.close()

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

    def test_남의_회사는_목록에도_안_보이고_접근하면_404(self):
        회사id = self.client.post("/companies", json={"회사명": "스코핑회사"}).json()["id"]
        생성 = self.client.post(f"/companies/{회사id}/fiscal-years", json=FY2025_페이로드)
        사업연도id = 생성.json()["id"]

        # 다른 사용자로 전환 — override 람다가 self._사용자를 읽으므로 바꾸면 즉시 적용
        self._사용자 = {"id": self._사용자_생성("other@example.com"), "이메일": "other@example.com", "auth_uid": "uid-other"}

        self.assertEqual(self.client.get("/companies").json(), [])
        self.assertEqual(self.client.get(f"/companies/{회사id}/fiscal-years").status_code, 404)
        self.assertEqual(self.client.get(f"/fiscal-years/{사업연도id}").status_code, 404)
        self.assertEqual(self.client.post(f"/fiscal-years/{사업연도id}/calculate").status_code, 404)
        self.assertEqual(self.client.get(f"/fiscal-years/{사업연도id}/snapshots").status_code, 404)

    def test_토큰_없으면_401(self):
        # 인증 override를 걷어내고 실제 현재사용자 dependency로 — 헤더가 없으니 401이어야 한다
        del app.dependency_overrides[현재사용자]
        r = self.client.get("/companies")
        self.assertEqual(r.status_code, 401)

    def test_회사_프로필_저장_조회_수정(self):
        생성 = self.client.post("/companies", json={
            "회사명": "프로필회사", "설립연도": 2017, "중소기업": True, "부동산임대업주업": True,
            "상시근로자수": 1,
            "지배주주목록": [{"명": "김대표", "지분율": 60}, {"명": "이가족", "지분율": 40}],
        })
        self.assertEqual(생성.status_code, 201)
        회사id = 생성.json()["id"]
        self.assertEqual(생성.json()["설립연도"], 2017)

        조회 = self.client.get(f"/companies/{회사id}").json()
        self.assertEqual(조회["중소기업"], True)
        self.assertEqual(조회["지배주주목록"], [
            {"명": "김대표", "지분율": 60.0}, {"명": "이가족", "지분율": 40.0},
        ])

        # 부분 수정 — 보낸 필드만 바뀌고 지배주주는 명단 전체 교체
        수정 = self.client.patch(f"/companies/{회사id}", json={
            "상시근로자수": 2, "지배주주목록": [{"명": "김대표", "지분율": 100}],
        }).json()
        self.assertEqual(수정["상시근로자수"], 2)
        self.assertEqual(수정["설립연도"], 2017)  # 안 보낸 필드는 유지
        self.assertEqual(수정["지배주주목록"], [{"명": "김대표", "지분율": 100.0}])

    def test_같은_종료일_사업연도는_409와_기존id를_안내한다(self):
        회사id = self.client.post("/companies", json={"회사명": "중복연도회사"}).json()["id"]
        첫id = self.client.post(f"/companies/{회사id}/fiscal-years", json=FY2025_페이로드).json()["id"]

        r = self.client.post(f"/companies/{회사id}/fiscal-years", json=FY2025_페이로드)
        self.assertEqual(r.status_code, 409)
        self.assertIn(f"id={첫id}", r.json()["detail"])

    def test_재제출하면_같은_id로_입력이_교체되고_스냅샷_이력은_남는다(self):
        회사id = self.client.post("/companies", json={"회사명": "재제출회사"}).json()["id"]
        사업연도id = self.client.post(f"/companies/{회사id}/fiscal-years", json=FY2025_페이로드).json()["id"]
        self.assertEqual(
            self.client.post(f"/fiscal-years/{사업연도id}/calculate").json()["차감납부세액"], 8_575_599
        )

        # 기납부세액 140,000 → 0 으로 고쳐 재제출 — 차감납부세액이 그만큼 늘어야 한다
        수정본 = {**FY2025_페이로드, "회사": {**FY2025_페이로드["회사"], "기납부세액": 0}}
        r = self.client.put(f"/companies/{회사id}/fiscal-years/{사업연도id}", json=수정본)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["id"], 사업연도id)  # id 유지 — 회사·사업연도 복제 없음

        self.assertEqual(
            self.client.post(f"/fiscal-years/{사업연도id}/calculate").json()["차감납부세액"], 8_715_599
        )
        # 스냅샷은 append-only — 수정 전 계산 기록도 이력으로 남는다
        self.assertEqual(len(self.client.get(f"/fiscal-years/{사업연도id}/snapshots").json()), 2)

    def test_재제출도_검증실패면_422_롤백(self):
        회사id = self.client.post("/companies", json={"회사명": "재제출검증회사"}).json()["id"]
        사업연도id = self.client.post(f"/companies/{회사id}/fiscal-years", json=FY2025_페이로드).json()["id"]

        깨진 = {**FY2025_페이로드, "재무상태표": [{"계정": "보통예금", "구분": "자산", "금액": 999}]}
        r = self.client.put(f"/companies/{회사id}/fiscal-years/{사업연도id}", json=깨진)
        self.assertEqual(r.status_code, 422)
        # 기존 입력은 그대로 살아 있어야 한다
        상세 = self.client.get(f"/fiscal-years/{사업연도id}").json()
        self.assertEqual(len(상세["자산대장"]), 3)


if __name__ == "__main__":
    unittest.main()
