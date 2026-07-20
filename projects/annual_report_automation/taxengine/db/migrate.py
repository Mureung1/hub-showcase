"""CSV(data/private/<사업연도>/*.csv) → SQLite 이관 로직.

설계 근거: notes/DB-스키마-설계.md §9. taxengine.loader.로드()가 이미 CSV 5~7종을
pipeline.py가 쓰는 것과 같은 한글 키 딕셔너리로 파싱해 두므로, 이 모듈은 그 결과를
받아 taxengine/db/schema.sql의 테이블에 그대로 옮겨 담는다 — CSV 파싱을 다시 하지 않는다.

범위: 순수 이관만 한다(설계문서 §9 1~4단계). 계산스냅샷(pipeline.실행() 결과 저장)은
만들지 않는다 — 그건 "이관 직후 최초 계산"이라는 별도 관심사라 여기 넣지 않았다(§9 5단계).
ORM은 쓰지 않는다 — schema.sql이 이미 sqlite3 표준 라이브러리로 검증됐고(§8), 행 개수가
소상공인 1개 사업연도 규모라 ORM이 벌어주는 게 거의 없다(과설계 회피).

여러 사업연도 폴더를 한 번에 넘기면(오래된 연도 → 최신 연도 순서) 사업연도.전기사업연도id·
자산.전기자산id를 자동으로 연결한다 — assets.csv의 '명' 문자열로 전기 자산을 찾는다
(carryover.py의 연속성검증()이 이미 겪는 것과 같은 한계: 자산명을 연도마다 똑같이 적어야 이어진다).
"""

from __future__ import annotations

import sqlite3
from decimal import Decimal, InvalidOperation
from pathlib import Path

from taxengine.loader import 로드
from taxengine.money import 원, 반올림

SCHEMA_PATH = Path(__file__).parent / "schema.sql"


# ── 타입 변환 헬퍼 (CSV 문자열 → INTEGER 컬럼) ──────────────────────────

def _금액(v, *, 기본값=None):
    """금액 문자열 → 원 단위 int. 빈 값이면 기본값(기본은 None)."""
    if v is None or v == "":
        return 기본값
    return int(원(v))


def _금액_필수(v, 필드설명: str) -> int:
    """NOT NULL 금액 컬럼용 — 빈 값이면 데이터가 불완전하다는 뜻이라 조용히 0으로 넘기지 않고 에러."""
    if v is None or v == "":
        raise ValueError(f"필수 금액이 비어 있음: {필드설명}")
    return int(원(v))


def _bp(v) -> int | None:
    """퍼센트(예: 33.33, 100) → basis point 정수(1% = 100bp). notes/DB-스키마-설계.md §4."""
    if v is None or v == "":
        return None
    try:
        pct = Decimal(str(v).replace(",", ""))
    except InvalidOperation:
        return None
    return int(반올림(pct * 100))


def _bool01(v) -> int:
    """coerce()가 이미 True/False로 바꿔둔 값(company.csv 등) → 0/1. 그 외(문자열 "true")도 허용."""
    if isinstance(v, bool):
        return 1 if v else 0
    return 1 if str(v).strip().lower() == "true" else 0


# ── DB 연결 ──────────────────────────────────────────────────────────

def db_열기(db_path: Path) -> sqlite3.Connection:
    """DB 파일을 연다. 파일이 없으면 schema.sql을 로드해 새로 만든다."""
    db_path = Path(db_path)
    새로만듦 = not db_path.exists()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON")
    if 새로만듦:
        conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
        conn.commit()
    return conn


# ── 삽입 함수 (테이블당 하나) ─────────────────────────────────────────

def 회사_생성(conn: sqlite3.Connection, 이름: str) -> int:
    cur = conn.execute("INSERT INTO 회사 (회사명) VALUES (?)", (이름,))
    return cur.lastrowid


def 사용자_확보(conn: sqlite3.Connection, 이메일: str) -> int:
    row = conn.execute("SELECT id FROM 사용자 WHERE 이메일 = ?", (이메일,)).fetchone()
    if row:
        return row[0]
    return conn.execute("INSERT INTO 사용자 (이메일) VALUES (?)", (이메일,)).lastrowid


def 최근_사업연도_찾기(conn: sqlite3.Connection, 회사id: int) -> int | None:
    row = conn.execute(
        "SELECT id FROM 사업연도 WHERE 회사id = ? ORDER BY 사업연도종료일 DESC LIMIT 1",
        (회사id,),
    ).fetchone()
    return row[0] if row else None


def 자산_명_매핑(conn: sqlite3.Connection, 사업연도id: int | None) -> dict[str, int]:
    if 사업연도id is None:
        return {}
    rows = conn.execute("SELECT id, 명 FROM 자산 WHERE 사업연도id = ?", (사업연도id,)).fetchall()
    return {명: id for id, 명 in rows}


def 사업연도_삽입(conn: sqlite3.Connection, 회사id: int, 회사: dict, 전기사업연도id: int | None) -> int:
    cur = conn.execute(
        """INSERT INTO 사업연도 (
            회사id, 사업연도개시일, 사업연도종료일, 중소기업, 부동산임대업주업, 상시근로자수,
            지배주주지분율_bp, 기납부세액, 이월결손금, 공제감면세액, 가산세, 기부금한도초과,
            수입금액, 기업업무추진비_증빙불비금액, 전기사업연도id
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            회사id,
            회사["사업연도개시일"], 회사["사업연도종료일"],
            _bool01(회사.get("중소기업")), _bool01(회사.get("부동산임대업주업")),
            회사.get("상시근로자수"),
            _bp(회사.get("지배주주지분율")),
            _금액(회사.get("기납부세액"), 기본값=0),
            _금액(회사.get("이월결손금"), 기본값=0),
            _금액(회사.get("공제감면세액"), 기본값=0),
            _금액(회사.get("가산세"), 기본값=0),
            _금액(회사.get("기부금한도초과"), 기본값=0),
            _금액(회사.get("수입금액")),  # NULL 허용 = 추진비 한도 자동계산 생략
            _금액(회사.get("기업업무추진비_증빙불비금액"), 기본값=0),
            전기사업연도id,
        ),
    )
    return cur.lastrowid


def 재무상태표_삽입(conn: sqlite3.Connection, 사업연도id: int, rows: list[dict]) -> None:
    for i, r in enumerate(rows):
        금액 = _금액(r.get("금액"))
        if 금액 is None:  # 템플릿의 빈 칸(=이 계정 안 씀)은 행을 만들지 않는다
            continue
        conn.execute(
            "INSERT INTO 재무상태표항목 (사업연도id, 계정, 구분, 금액, 정렬순서) VALUES (?,?,?,?,?)",
            (사업연도id, r["계정"], r["구분"], 금액, i),
        )


def 손익계산서_삽입(conn: sqlite3.Connection, 사업연도id: int, rows: list[dict]) -> None:
    for i, r in enumerate(rows):
        금액 = _금액(r.get("금액"))
        if 금액 is None:
            continue
        conn.execute(
            "INSERT INTO 손익계산서항목 (사업연도id, 계정, 구분, 금액, 정렬순서) VALUES (?,?,?,?,?)",
            (사업연도id, r["계정"], r["구분"], 금액, i),
        )


def 자산_삽입(conn: sqlite3.Connection, 사업연도id: int, rows: list[dict], 전기자산_매핑: dict[str, int]) -> dict[str, int]:
    """자산대장을 삽입하고, '명' → 새 id 매핑을 돌려준다(다음 연도 이월 연결용)."""
    새매핑: dict[str, int] = {}
    for r in rows:
        cur = conn.execute(
            """INSERT INTO 자산 (
                사업연도id, 명, 구분, 취득일, 취득가, 기초누계, 회사계상액, 방법,
                내용연수, 전기이월부인액, 업무용승용차, 전기자산id
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                사업연도id, r["명"], r["구분"], r["취득일"],
                _금액_필수(r.get("취득가"), f"자산 '{r['명']}'.취득가"),
                _금액(r.get("기초누계"), 기본값=0),
                _금액(r.get("회사계상액")),  # NULL 허용: 없으면 엔진이 상각범위액을 계상액으로 간주
                r.get("방법") or None,
                int(str(r["내용연수"]).replace(",", "")),
                _금액(r.get("전기이월부인액"), 기본값=0),
                _bool01(r.get("업무용승용차")),
                전기자산_매핑.get(r["명"]),
            ),
        )
        새매핑[r["명"]] = cur.lastrowid
    return 새매핑


def 차량_삽입(conn: sqlite3.Connection, 사업연도id: int, rows: list[dict]) -> None:
    for r in rows:
        conn.execute(
            """INSERT INTO 차량 (
                사업연도id, 명, 감가상각비, 기타관련비용, 전용보험가입, 운행기록부작성, 업무사용비율_bp
            ) VALUES (?,?,?,?,?,?,?)""",
            (
                사업연도id, r["명"],
                _금액(r.get("감가상각비"), 기본값=0),
                _금액(r.get("기타관련비용"), 기본값=0),
                _bool01(r.get("전용보험가입")),
                _bool01(r.get("운행기록부작성")),
                _bp(r.get("업무사용비율")),
            ),
        )


def 세무조정_삽입(conn: sqlite3.Connection, 사업연도id: int, rows: list[dict]) -> None:
    for r in rows:
        conn.execute(
            "INSERT INTO 세무조정 (사업연도id, 과목, 구분, 금액, 소득처분, 근거) VALUES (?,?,?,?,?,?)",
            (
                사업연도id, r["과목"], r["구분"],
                _금액_필수(r.get("금액"), f"세무조정 '{r['과목']}'.금액"),
                r.get("소득처분") or None, r.get("근거") or None,
            ),
        )


def 정답지_삽입(conn: sqlite3.Connection, 사업연도id: int, 정답: dict | None) -> None:
    if not 정답:
        return
    conn.execute(
        """INSERT INTO 정답지 (사업연도id, 각사업연도소득, 과세표준, 산출세액, 차감납부세액, 지방소득세)
           VALUES (?,?,?,?,?,?)""",
        (
            사업연도id,
            _금액(정답.get("각사업연도소득")), _금액(정답.get("과세표준")),
            _금액(정답.get("산출세액")), _금액(정답.get("차감납부세액")),
            _금액(정답.get("지방소득세")),
        ),
    )


# ── 폴더 단위 이관 ────────────────────────────────────────────────────

def 폴더_이관(conn: sqlite3.Connection, 회사id: int, folder: Path,
           전기사업연도id: int | None, 전기자산_매핑: dict[str, int]) -> tuple[int, dict[str, int]]:
    """사업연도 폴더 하나를 이관하고 (새 사업연도id, 이 폴더의 자산 명→id 매핑)을 돌려준다."""
    data = 로드(folder)
    사업연도id = 사업연도_삽입(conn, 회사id, data["회사"], 전기사업연도id)
    if data["재무상태표"]:
        재무상태표_삽입(conn, 사업연도id, data["재무상태표"])
    손익계산서_삽입(conn, 사업연도id, data["손익계산서"])
    새자산매핑 = 자산_삽입(conn, 사업연도id, data["자산대장"], 전기자산_매핑)
    if data["차량대장"]:
        차량_삽입(conn, 사업연도id, data["차량대장"])
    세무조정_삽입(conn, 사업연도id, data["조정"])
    정답지_삽입(conn, 사업연도id, data["정답"])
    return 사업연도id, 새자산매핑


# ── 전체 이관 오케스트레이션 ──────────────────────────────────────────

def 이관(
    conn: sqlite3.Connection,
    dirs: list[Path],
    *,
    company_name: str | None = None,
    company_id: int | None = None,
    owner_email: str | None = None,
    dry_run: bool = False,
) -> dict:
    """dirs(오래된 연도 → 최신 연도 순서)를 회사 하나로 이관한다.

    company_name(새 회사 생성) 또는 company_id(기존 회사에 이어붙임) 중 정확히 하나를 받는다.
    """
    if not dirs:
        raise ValueError("이관할 폴더가 없음")
    if bool(company_name) == bool(company_id):
        raise ValueError("company_name과 company_id 중 정확히 하나만 지정해야 함")

    try:
        if company_name:
            회사id = 회사_생성(conn, company_name)
            전기사업연도id = None
        else:
            row = conn.execute("SELECT id FROM 회사 WHERE id = ?", (company_id,)).fetchone()
            if not row:
                raise ValueError(f"회사id {company_id}를 찾을 수 없음")
            회사id = company_id
            전기사업연도id = 최근_사업연도_찾기(conn, 회사id)

        if owner_email:
            사용자id = 사용자_확보(conn, owner_email)
            conn.execute(
                "INSERT OR IGNORE INTO 회사_사용자 (회사id, 사용자id, 역할) VALUES (?, ?, 'owner')",
                (회사id, 사용자id),
            )

        전기자산_매핑 = 자산_명_매핑(conn, 전기사업연도id)
        사업연도id들 = []
        for folder in dirs:
            사업연도id, 전기자산_매핑 = 폴더_이관(conn, 회사id, Path(folder), 전기사업연도id, 전기자산_매핑)
            사업연도id들.append(사업연도id)
            전기사업연도id = 사업연도id

        if dry_run:
            conn.rollback()
        else:
            conn.commit()

        return {"회사id": 회사id, "사업연도id들": 사업연도id들, "dirs": [str(d) for d in dirs]}
    except Exception:
        conn.rollback()
        raise
