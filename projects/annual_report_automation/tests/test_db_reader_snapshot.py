"""DB 리더 + 계산스냅샷 검증.

핵심 주장: CSV로 직접 계산한 결과와, 같은 데이터를 DB에 이관한 뒤 DB에서 읽어 계산한 결과가
'금액' 기준으로 완전히 같아야 한다 — pipeline.실행_데이터()가 입력 출처를 모른다는 설계(§1)의
증명. bp·0/1 인코딩 왕복(자산 명 매칭 이월 포함), 계산스냅샷 저장/컬럼 값도 함께 확인한다.
"""

import json
import sqlite3
import unittest
from decimal import Decimal
from pathlib import Path

from taxengine.db.migrate import 이관
from taxengine.db.reader import 로드
from taxengine.db.snapshot import 저장
from taxengine.pipeline import 실행, 실행_데이터

ROOT = Path(__file__).resolve().parent.parent
FY2025 = ROOT / "data" / "example" / "fy2025"
E2Y = ROOT / "data" / "example-2y"


def _메모리_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript((ROOT / "taxengine" / "db" / "schema.sql").read_text(encoding="utf-8"))
    return conn


class CSV_직접계산_vs_DB경유계산(unittest.TestCase):
    def setUp(self):
        self.conn = _메모리_conn()
        결과 = 이관(self.conn, [FY2025], company_name="왕복테스트")
        self.사업연도id = 결과["사업연도id들"][0]
        self.csv결과 = 실행(FY2025)
        self.db결과 = 실행_데이터(로드(self.conn, self.사업연도id))

    def test_차감납부세액이_같다(self):
        self.assertEqual(self.db결과["r"]["차감납부세액"], self.csv결과["r"]["차감납부세액"])

    def test_각사업연도소득_과세표준_산출세액이_같다(self):
        for key in ("각사업연도소득", "과세표준", "산출세액", "총납부세액"):
            self.assertEqual(self.db결과["r"][key], self.csv결과["r"][key], key)

    def test_감가상각_시부인_결과가_같다(self):
        self.assertEqual(self.db결과["감가부인"], self.csv결과["감가부인"])
        self.assertEqual(self.db결과["감가추인"], self.csv결과["감가추인"])

    def test_정답지_대조가_DB경유에서도_통과한다(self):
        self.assertTrue(self.db결과["v"]["ok"])
        self.assertEqual(
            self.db결과["r"]["차감납부세액"],
            Decimal(str(self.db결과["정답"]["차감납부세액"])),
        )


class 자산_이월_왕복(unittest.TestCase):
    """bp·명 매칭 이월이 DB를 거쳐도 carryover.py 없이 시부인 계산 자체에서 어긋나지 않는지."""

    def test_2025_시부인이_CSV와_DB에서_같다(self):
        conn = _메모리_conn()
        결과 = 이관(conn, [E2Y / "2024", E2Y / "2025"], company_name="이월왕복")
        id_2025 = 결과["사업연도id들"][1]

        csv결과 = 실행(E2Y / "2025")
        db결과 = 실행_데이터(로드(conn, id_2025))

        self.assertEqual(len(db결과["시부인들"]), len(csv결과["시부인들"]))
        for a, b in zip(db결과["시부인들"], csv결과["시부인들"]):
            self.assertEqual(a["부인액"], b["부인액"])
            self.assertEqual(a["추인액"], b["추인액"])


class 계산스냅샷_저장(unittest.TestCase):
    def setUp(self):
        self.conn = _메모리_conn()
        결과 = 이관(self.conn, [FY2025], company_name="스냅샷테스트")
        self.사업연도id = 결과["사업연도id들"][0]
        self.out = 실행_데이터(로드(self.conn, self.사업연도id))

    def test_저장하면_계산스냅샷_한_행이_생긴다(self):
        저장(self.conn, self.사업연도id, self.out, 엔진버전="test-1")
        self.conn.commit()
        n = self.conn.execute(
            "SELECT COUNT(*) FROM 계산스냅샷 WHERE 사업연도id = ?", (self.사업연도id,)
        ).fetchone()[0]
        self.assertEqual(n, 1)

    def test_정규화_컬럼이_pipeline_결과와_일치한다(self):
        스냅샷id = 저장(self.conn, self.사업연도id, self.out, 엔진버전="test-1")
        row = self.conn.execute(
            """SELECT 차감납부세액, 각사업연도소득, 최저한세적용여부, 정답대조_일치항목수,
                      정답대조_전체항목수, 엔진버전
               FROM 계산스냅샷 WHERE id = ?""",
            (스냅샷id,),
        ).fetchone()
        차감납부세액, 각사업연도소득, 최저한세적용, 일치, 전체, 엔진버전 = row
        self.assertEqual(차감납부세액, int(self.out["r"]["차감납부세액"]))
        self.assertEqual(각사업연도소득, int(self.out["r"]["각사업연도소득"]))
        self.assertEqual(최저한세적용, 0)  # fy2025 예시는 최저한세 미적용
        self.assertEqual(전체, 5)  # answer.csv 5개 항목 전부 대조
        self.assertEqual(일치, 전체)  # 재현 성공 케이스
        self.assertEqual(엔진버전, "test-1")

    def test_원본결과_json이_역직렬화된다(self):
        스냅샷id = 저장(self.conn, self.사업연도id, self.out)
        raw = self.conn.execute(
            "SELECT 원본결과_json FROM 계산스냅샷 WHERE id = ?", (스냅샷id,)
        ).fetchone()[0]
        parsed = json.loads(raw)
        self.assertEqual(parsed["r"]["차감납부세액"], str(self.out["r"]["차감납부세액"]))

    def test_append_only_두번_저장하면_두_행(self):
        저장(self.conn, self.사업연도id, self.out)
        저장(self.conn, self.사업연도id, self.out)
        self.conn.commit()
        n = self.conn.execute(
            "SELECT COUNT(*) FROM 계산스냅샷 WHERE 사업연도id = ?", (self.사업연도id,)
        ).fetchone()[0]
        self.assertEqual(n, 2)


class 없는_사업연도id(unittest.TestCase):
    def test_리더가_명확한_에러를_낸다(self):
        conn = _메모리_conn()
        with self.assertRaises(ValueError):
            로드(conn, 999)


if __name__ == "__main__":
    unittest.main()
