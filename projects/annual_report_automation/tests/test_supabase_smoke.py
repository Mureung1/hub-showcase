"""Supabase(Postgres) 스모크 테스트 — TAXWIZ_DATABASE_URL이 설정된 경우에만 돈다(없으면 skip).

test_api.py와 같은 FY2025 페이로드로 "회사 생성 → 사업연도 → 계산 → 스냅샷"을 실제
Supabase에 대고 한 바퀴 돌리고, 같은 정답(차감납부세액 8,575,599)을 대조한다 —
schema.sql(SQLite)과 schema.postgres.sql이 어긋나면(드리프트) 여기서 잡힌다.

    $env:TAXWIZ_DATABASE_URL="postgresql://...pooler.supabase.com:5432/postgres?sslmode=require"
    python -m pytest tests/test_supabase_smoke.py -q

끝나면 테스트가 만든 회사를 삭제해(FK CASCADE) 원격 DB를 깨끗하게 유지한다.
"""

import os
import unittest

from tests.test_api import FY2025_페이로드

URL = os.environ.get("TAXWIZ_DATABASE_URL")


@unittest.skipUnless(URL, "TAXWIZ_DATABASE_URL 없음 — Supabase 스모크 생략")
class Supabase_스모크(unittest.TestCase):
    스모크_이메일 = "smoke-test@taxwiz.local"

    def setUp(self):
        from fastapi.testclient import TestClient

        from taxengine.api.auth import 현재사용자
        from taxengine.api.main import app, get_conn
        from taxengine.db.conn import db_열기
        from taxengine.db.migrate import 사용자_확보

        self._만든_회사id들: list[int] = []

        # 스코핑(회사_사용자 FK)이 실제 사용자 행을 요구하므로 원격 DB에 스모크 사용자를 확보
        conn = db_열기(URL)
        try:
            사용자id = 사용자_확보(conn, self.스모크_이메일)
            conn.commit()
        finally:
            conn.close()
        self._사용자 = {"id": 사용자id, "이메일": self.스모크_이메일, "auth_uid": "uid-smoke"}

        def _override():
            conn = db_열기(URL)
            try:
                yield conn
            finally:
                conn.close()

        app.dependency_overrides[get_conn] = _override
        app.dependency_overrides[현재사용자] = lambda: self._사용자
        self._app = app
        self.client = TestClient(app)

    def tearDown(self):
        from taxengine.db.conn import db_열기

        conn = db_열기(URL)
        try:
            for 회사id in self._만든_회사id들:
                conn.execute("DELETE FROM 회사 WHERE id = ?", (회사id,))
            conn.execute("DELETE FROM 사용자 WHERE 이메일 = ?", (self.스모크_이메일,))
            conn.commit()
        finally:
            conn.close()
        self._app.dependency_overrides.clear()

    def _회사_생성(self, 이름: str) -> int:
        r = self.client.post("/companies", json={"회사명": 이름})
        self.assertEqual(r.status_code, 201, r.text)
        회사id = r.json()["id"]
        self._만든_회사id들.append(회사id)
        return 회사id

    def test_전체_흐름_생성_계산_이력조회(self):
        회사id = self._회사_생성("SUPABASE_SMOKE")

        생성 = self.client.post(f"/companies/{회사id}/fiscal-years", json=FY2025_페이로드)
        self.assertEqual(생성.status_code, 201, 생성.text)
        사업연도id = 생성.json()["id"]

        계산 = self.client.post(f"/fiscal-years/{사업연도id}/calculate")
        self.assertEqual(계산.status_code, 200, 계산.text)
        결과 = 계산.json()
        self.assertEqual(결과["각사업연도소득"], 96_839_999)
        self.assertEqual(결과["차감납부세액"], 8_575_599)

        스냅샷들 = self.client.get(f"/fiscal-years/{사업연도id}/snapshots").json()
        self.assertEqual(len(스냅샷들), 1)
        self.assertEqual(스냅샷들[0]["차감납부세액"], 8_575_599)

    def test_검증실패는_Postgres에서도_롤백된다(self):
        회사id = self._회사_생성("SUPABASE_SMOKE_롤백")
        깨진_페이로드 = {
            **FY2025_페이로드,
            "재무상태표": [{"계정": "보통예금", "구분": "자산", "금액": 999}],
        }
        r = self.client.post(f"/companies/{회사id}/fiscal-years", json=깨진_페이로드)
        self.assertEqual(r.status_code, 422)
        self.assertEqual(self.client.get(f"/companies/{회사id}/fiscal-years").json(), [])


if __name__ == "__main__":
    unittest.main()
