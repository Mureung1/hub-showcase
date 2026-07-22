"""CSV → SQLite 이관 검증.

data/example/fy2025(단일연도, 재무제표·정답지 포함)와 data/example-2y(2개년, 이월 체인)로
이관 결과가 원본 CSV와 일치하는지, 그리고 전기사업연도id·전기자산id가 올바르게 연결되는지 확인한다.
"""

import shutil
import sqlite3
import tempfile
import unittest
from pathlib import Path

from taxengine.db.migrate import 검증실패, 이관, db_열기

ROOT = Path(__file__).resolve().parent.parent
FY2025 = ROOT / "data" / "example" / "fy2025"
E2Y = ROOT / "data" / "example-2y"


def _메모리_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript((ROOT / "taxengine" / "db" / "schema.sql").read_text(encoding="utf-8"))
    return conn


class 단일연도_이관(unittest.TestCase):
    def setUp(self):
        self.conn = _메모리_conn()
        self.결과 = 이관(self.conn, [FY2025], company_name="테스트회사")

    def test_회사와_사업연도가_생긴다(self):
        회사id = self.결과["회사id"]
        row = self.conn.execute("SELECT 회사명 FROM 회사 WHERE id = ?", (회사id,)).fetchone()
        self.assertEqual(row[0], "테스트회사")
        self.assertEqual(len(self.결과["사업연도id들"]), 1)

    def test_지분율이_basis_point로_변환된다(self):
        사업연도id = self.결과["사업연도id들"][0]
        row = self.conn.execute(
            "SELECT 지배주주지분율_bp FROM 사업연도 WHERE id = ?", (사업연도id,)
        ).fetchone()
        self.assertEqual(row[0], 10000)  # company.csv: 지배주주지분율,100 → 100.00%

    def test_재무상태표_금액이_그대로_옮겨진다(self):
        사업연도id = self.결과["사업연도id들"][0]
        row = self.conn.execute(
            "SELECT 금액 FROM 재무상태표항목 WHERE 사업연도id = ? AND 계정 = '건물'", (사업연도id,)
        ).fetchone()
        self.assertEqual(row[0], 500_000_000)

    def test_정답지가_옮겨진다(self):
        사업연도id = self.결과["사업연도id들"][0]
        row = self.conn.execute(
            "SELECT 차감납부세액 FROM 정답지 WHERE 사업연도id = ?", (사업연도id,)
        ).fetchone()
        self.assertEqual(row[0], 8_575_599)

    def test_세무조정_행수가_CSV와_같다(self):
        사업연도id = self.결과["사업연도id들"][0]
        n = self.conn.execute(
            "SELECT COUNT(*) FROM 세무조정 WHERE 사업연도id = ?", (사업연도id,)
        ).fetchone()[0]
        self.assertEqual(n, 4)  # adjustments.csv 실데이터 4줄


class 이년치_이관_이월연결(unittest.TestCase):
    def setUp(self):
        self.conn = _메모리_conn()
        self.결과 = 이관(self.conn, [E2Y / "2024", E2Y / "2025"], company_name="이월테스트회사")
        self.id_2024, self.id_2025 = self.결과["사업연도id들"]

    def test_2025_사업연도의_전기사업연도id가_2024다(self):
        row = self.conn.execute(
            "SELECT 전기사업연도id FROM 사업연도 WHERE id = ?", (self.id_2025,)
        ).fetchone()
        self.assertEqual(row[0], self.id_2024)

    def test_2024_사업연도는_전기가_없다(self):
        row = self.conn.execute(
            "SELECT 전기사업연도id FROM 사업연도 WHERE id = ?", (self.id_2024,)
        ).fetchone()
        self.assertIsNone(row[0])

    def test_2025_자산의_전기자산id가_2024_자산을_가리킨다(self):
        자산_2024 = self.conn.execute(
            "SELECT id FROM 자산 WHERE 사업연도id = ? AND 명 = '비품'", (self.id_2024,)
        ).fetchone()[0]
        전기자산id = self.conn.execute(
            "SELECT 전기자산id FROM 자산 WHERE 사업연도id = ? AND 명 = '비품'", (self.id_2025,)
        ).fetchone()[0]
        self.assertEqual(전기자산id, 자산_2024)

    def test_이월값_검증_쿼리가_설계문서_예시와_일치한다(self):
        # notes/DB-스키마-설계.md §5의 쿼리 재현: 전기가 함의하는 기초누계 == 당기 입력값
        row = self.conn.execute(
            """SELECT (전기.기초누계 + 전기.회사계상액) AS 기대,
                      당기.기초누계 AS 입력
               FROM 자산 AS 당기 JOIN 자산 AS 전기 ON 당기.전기자산id = 전기.id
               WHERE 당기.사업연도id = ?""",
            (self.id_2025,),
        ).fetchone()
        self.assertEqual(row[0], row[1])  # 0 + 3,000,000 == 3,000,000


class 이어붙이기_기존_회사(unittest.TestCase):
    """--company-id로 이미 이관된 회사에 새 연도를 나중에 이어붙이는 경로."""

    def test_두번에_나눠_이관해도_전기사업연도id가_연결된다(self):
        conn = _메모리_conn()
        r1 = 이관(conn, [E2Y / "2024"], company_name="분할이관회사")
        r2 = 이관(conn, [E2Y / "2025"], company_id=r1["회사id"])

        self.assertEqual(r1["회사id"], r2["회사id"])
        row = conn.execute(
            "SELECT 전기사업연도id FROM 사업연도 WHERE id = ?", (r2["사업연도id들"][0],)
        ).fetchone()
        self.assertEqual(row[0], r1["사업연도id들"][0])


class dry_run_은_커밋하지_않는다(unittest.TestCase):
    def test_dry_run_후_회사가_안_남는다(self):
        conn = _메모리_conn()
        이관(conn, [FY2025], company_name="드라이런회사", dry_run=True)
        n = conn.execute("SELECT COUNT(*) FROM 회사").fetchone()[0]
        self.assertEqual(n, 0)


class 인자_검증(unittest.TestCase):
    def test_company_와_company_id_둘다_없으면_에러(self):
        conn = _메모리_conn()
        with self.assertRaises(ValueError):
            이관(conn, [FY2025])

    def test_company_와_company_id_둘다_있으면_에러(self):
        conn = _메모리_conn()
        with self.assertRaises(ValueError):
            이관(conn, [FY2025], company_name="a", company_id=1)


class DB_파일_새로_생성(unittest.TestCase):
    def test_없는_파일이면_schema로_새로_만든다(self, tmp_path=None):
        import tempfile
        with tempfile.TemporaryDirectory() as td:
            db_path = Path(td) / "sub" / "새db.db"
            conn = db_열기(db_path)
            try:
                self.assertTrue(db_path.exists())
                tables = {
                    r[0] for r in conn.execute(
                        "SELECT name FROM sqlite_master WHERE type = 'table'"
                    ).fetchall()
                }
                self.assertIn("사업연도", tables)
                self.assertIn("계산스냅샷", tables)
            finally:
                conn.close()


class 검증실패_이관_거부(unittest.TestCase):
    """DB의 CHECK 제약이 못 잡는 무결성 오류(대차평형·자산 정합성)는 검증()이 막아야 한다."""

    def test_대차가_안맞으면_이관이_거부되고_아무것도_안_남는다(self):
        with tempfile.TemporaryDirectory() as td:
            broken = Path(td) / "broken"
            shutil.copytree(FY2025, broken)
            (broken / "balance_sheet.csv").write_text(
                "계정,구분,금액\n보통예금,자산,99999999\n", encoding="utf-8"
            )
            conn = _메모리_conn()
            with self.assertRaises(검증실패):
                이관(conn, [broken], company_name="검증실패테스트1")
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM 회사").fetchone()[0], 0)

    def test_기초누계가_취득가_넘으면_이관이_거부된다(self):
        with tempfile.TemporaryDirectory() as td:
            broken = Path(td) / "broken"
            shutil.copytree(FY2025, broken)
            (broken / "assets.csv").write_text(
                "명,구분,취득일,취득가,기초누계,회사계상액,방법,내용연수,전기이월부인액,업무용승용차\n"
                "이상자산,비품,2020-01-01,1000000,2000000,100000,정액,5,0,false\n",
                encoding="utf-8",
            )
            conn = _메모리_conn()
            with self.assertRaises(검증실패):
                이관(conn, [broken], company_name="검증실패테스트2")
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM 자산").fetchone()[0], 0)

    def test_2개년_이관에서_두번째_폴더가_실패하면_첫번째도_같이_롤백된다(self):
        with tempfile.TemporaryDirectory() as td:
            broken_2025 = Path(td) / "2025"
            shutil.copytree(E2Y / "2025", broken_2025)
            (broken_2025 / "assets.csv").write_text(
                "명,구분,취득일,취득가,기초누계,회사계상액,방법,내용연수,전기이월부인액,업무용승용차\n"
                "이상자산,비품,2020-01-01,1000000,2000000,100000,정액,5,0,false\n",
                encoding="utf-8",
            )
            conn = _메모리_conn()
            with self.assertRaises(검증실패):
                이관(conn, [E2Y / "2024", broken_2025], company_name="검증실패테스트3")
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM 사업연도").fetchone()[0], 0)


if __name__ == "__main__":
    unittest.main()
