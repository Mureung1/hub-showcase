"""CSV(data/private/<사업연도>/*.csv) → DB 이관 로직 (SQLite/Postgres 공용 — conn.py 참고).

설계 근거: notes/DB-스키마-설계.md §9. taxengine.loader.로드()가 이미 CSV 5~7종을
pipeline.py가 쓰는 것과 같은 한글 키 딕셔너리로 파싱해 두므로, 이 모듈은 그 결과를
받아 taxengine/db/schema.sql의 테이블에 그대로 옮겨 담는다 — CSV 파싱을 다시 하지 않는다.

범위: 순수 이관만 한다(설계문서 §9 1~4단계). 계산스냅샷(pipeline.실행() 결과 저장)은
"이관 직후 최초 계산"이라는 별도 관심사라 여기 넣지 않았다(§9 5단계) — taxengine.db.snapshot이
그 역할을 한다. ORM은 쓰지 않는다 — schema.sql이 이미 sqlite3 표준 라이브러리로 검증됐고(§8),
행 개수가 소상공인 1개 사업연도 규모라 ORM이 벌어주는 게 거의 없다(과설계 회피).

폴더 하나를 이관하기 전에 taxengine.validate.검증()을 반드시 통과시킨다 — DB의 CHECK 제약은
행 하나짜리 오타(구분 값 등)만 잡고, 대차평형·당기순이익처럼 여러 행을 합산해야 아는 무결성
오류는 못 잡는다. "정답지 원칙"(PLAN.md §2-2 — "대충 맞는 AI는 실무에서 아무도 안 쓴다")을
CSV 계산 경로(cli/reproduce.py)뿐 아니라 DB 이관 경로에도 똑같이 적용한 것.

여러 사업연도 폴더를 한 번에 넘기면(오래된 연도 → 최신 연도 순서) 사업연도.전기사업연도id·
자산.전기자산id를 자동으로 연결한다 — assets.csv의 '명' 문자열로 전기 자산을 찾는다
(carryover.py의 연속성검증()이 이미 겪는 것과 같은 한계: 자산명을 연도마다 똑같이 적어야 이어진다).
"""

from __future__ import annotations

from decimal import Decimal, InvalidOperation
from pathlib import Path

# db_열기는 conn.py로 이동했지만 여기서 re-export한다 — cli/migrate.py, cli/snapshot.py,
# tests/test_api.py가 `from taxengine.db.migrate import db_열기`로 이미 쓰고 있다(하위호환).
from taxengine.db.conn import PG인가, db_열기, 삽입후id, 연결  # noqa: F401
from taxengine.loader import 로드
from taxengine.money import 원, 반올림
from taxengine.validate import 검증


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


# ── 삽입 함수 (테이블당 하나) ─────────────────────────────────────────

def _지금() -> str:
    """수정일시용 UTC ISO 문자열 — SQLite(TEXT)·Postgres(timestamptz 캐스팅) 양쪽에서 통한다."""
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat()


def 회사_생성(conn: 연결, 이름: str, 프로필: dict | None = None) -> int:
    회사id = 삽입후id(conn, "INSERT INTO 회사 (회사명) VALUES (?)", (이름,))
    if 프로필:
        회사_프로필_갱신(conn, 회사id, 프로필)
    return 회사id


def 회사_프로필_갱신(conn: 연결, 회사id: int, 프로필: dict) -> None:
    """회사 "거의 고정" 프로필을 부분 갱신한다 — 프로필 dict에 들어 있는 키만 반영.

    지배주주목록은 delete-and-insert(명단 전체 교체). 키 이름은 화이트리스트로만
    SET 절에 들어가므로 f-string이어도 안전하다.
    """
    갱신값: dict = {}
    for 키 in ("설립연도", "상시근로자수"):
        if 키 in 프로필:
            갱신값[키] = 프로필[키]
    for 키 in ("중소기업", "부동산임대업주업"):
        if 키 in 프로필:
            갱신값[키] = _bool01(프로필[키])
    if 갱신값:
        set절 = ", ".join(f"{k} = ?" for k in 갱신값)
        conn.execute(
            f"UPDATE 회사 SET {set절}, 수정일시 = ? WHERE id = ?",
            (*갱신값.values(), _지금(), 회사id),
        )
    if 프로필.get("지배주주목록") is not None:
        conn.execute("DELETE FROM 지배주주 WHERE 회사id = ?", (회사id,))
        for i, 주주 in enumerate(프로필["지배주주목록"]):
            conn.execute(
                "INSERT INTO 지배주주 (회사id, 명, 지분율_bp, 정렬순서) VALUES (?,?,?,?)",
                (회사id, 주주["명"], _bp(주주["지분율"]), i),
            )


def 사용자_확보(conn: 연결, 이메일: str) -> int:
    row = conn.execute("SELECT id FROM 사용자 WHERE 이메일 = ?", (이메일,)).fetchone()
    if row:
        return row[0]
    return 삽입후id(conn, "INSERT INTO 사용자 (이메일) VALUES (?)", (이메일,))


def 최근_사업연도_찾기(conn: 연결, 회사id: int) -> int | None:
    row = conn.execute(
        "SELECT id FROM 사업연도 WHERE 회사id = ? ORDER BY 사업연도종료일 DESC LIMIT 1",
        (회사id,),
    ).fetchone()
    return row[0] if row else None


def 자산_명_매핑(conn: 연결, 사업연도id: int | None) -> dict[str, int]:
    if 사업연도id is None:
        return {}
    rows = conn.execute("SELECT id, 명 FROM 자산 WHERE 사업연도id = ?", (사업연도id,)).fetchall()
    return {명: id for id, 명 in rows}


# 사업연도 행의 "입력 필드" 13개 — 삽입(사업연도_삽입)과 재제출 갱신(사업연도_갱신)이 공유한다.
_사업연도_필드 = (
    "사업연도개시일", "사업연도종료일", "중소기업", "부동산임대업주업", "상시근로자수",
    "지배주주지분율_bp", "기납부세액", "이월결손금", "공제감면세액", "가산세", "기부금한도초과",
    "수입금액", "기업업무추진비_증빙불비금액",
)


def _사업연도_값들(회사: dict) -> tuple:
    """company.csv/API 요청의 회사 dict → _사업연도_필드 순서의 DB 값 튜플."""
    return (
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
    )


def 사업연도_삽입(conn: 연결, 회사id: int, 회사: dict, 전기사업연도id: int | None) -> int:
    return 삽입후id(
        conn,
        f"""INSERT INTO 사업연도 (회사id, {", ".join(_사업연도_필드)}, 전기사업연도id)
            VALUES (?,{",".join("?" * len(_사업연도_필드))},?)""",
        (회사id, *_사업연도_값들(회사), 전기사업연도id),
    )


def 사업연도_갱신(conn: 연결, 사업연도id: int, 회사: dict) -> None:
    """재제출용 — 사업연도 행의 입력 필드를 통째로 덮어쓴다(id·회사id·전기사업연도id는 유지)."""
    set절 = ", ".join(f"{f} = ?" for f in _사업연도_필드)
    conn.execute(
        f"UPDATE 사업연도 SET {set절}, 수정일시 = ? WHERE id = ?",
        (*_사업연도_값들(회사), _지금(), 사업연도id),
    )


def 재무상태표_삽입(conn: 연결, 사업연도id: int, rows: list[dict]) -> None:
    for i, r in enumerate(rows):
        금액 = _금액(r.get("금액"))
        if 금액 is None:  # 템플릿의 빈 칸(=이 계정 안 씀)은 행을 만들지 않는다
            continue
        conn.execute(
            "INSERT INTO 재무상태표항목 (사업연도id, 계정, 구분, 금액, 정렬순서) VALUES (?,?,?,?,?)",
            (사업연도id, r["계정"], r["구분"], 금액, i),
        )


def 손익계산서_삽입(conn: 연결, 사업연도id: int, rows: list[dict]) -> None:
    for i, r in enumerate(rows):
        금액 = _금액(r.get("금액"))
        if 금액 is None:
            continue
        conn.execute(
            "INSERT INTO 손익계산서항목 (사업연도id, 계정, 구분, 금액, 정렬순서) VALUES (?,?,?,?,?)",
            (사업연도id, r["계정"], r["구분"], 금액, i),
        )


def 자산_삽입(conn: 연결, 사업연도id: int, rows: list[dict], 전기자산_매핑: dict[str, int]) -> dict[str, int]:
    """자산대장을 삽입하고, '명' → 새 id 매핑을 돌려준다(다음 연도 이월 연결용)."""
    새매핑: dict[str, int] = {}
    for r in rows:
        새매핑[r["명"]] = 삽입후id(
            conn,
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
    return 새매핑


def 차량_삽입(conn: 연결, 사업연도id: int, rows: list[dict]) -> None:
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


def 세무조정_삽입(conn: 연결, 사업연도id: int, rows: list[dict]) -> None:
    for r in rows:
        conn.execute(
            "INSERT INTO 세무조정 (사업연도id, 과목, 구분, 금액, 소득처분, 근거) VALUES (?,?,?,?,?,?)",
            (
                사업연도id, r["과목"], r["구분"],
                _금액_필수(r.get("금액"), f"세무조정 '{r['과목']}'.금액"),
                r.get("소득처분") or None, r.get("근거") or None,
            ),
        )


def 정답지_삽입(conn: 연결, 사업연도id: int, 정답: dict | None) -> None:
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


class 검증실패(ValueError):
    """이관하려는 CSV가 taxengine.validate.검증()을 통과하지 못했을 때 발생."""


# ── 데이터(딕셔너리) 단위 이관 — 폴더(CSV)든 API 요청 바디든 이 함수로 수렴한다 ─────

def 데이터_이관(
    conn: 연결, 회사id: int, data: dict,
    전기사업연도id: int | None, 전기자산_매핑: dict[str, int], *, 라벨: str = "입력",
) -> tuple[int, dict[str, int]]:
    """이미 로드된 데이터(loader.로드()와 같은 모양)를 이관하고 (새 사업연도id, 자산 명→id 매핑)을 돌려준다.

    이관 전에 taxengine.validate.검증()을 반드시 통과해야 한다 — DB에 잘못된 데이터를
    조용히 담지 않는다(모듈 docstring 참고). 실패하면 검증실패를 던져 호출자가 롤백하게 한다.
    CSV(폴더_이관)든 API 요청 바디(taxengine.api)든 이 함수 하나로 들어온다 — "어디서 왔는지"는
    호출자가 라벨로만 알려주면 된다(에러 메시지 맥락용).
    """
    _검증_통과확인(data, 라벨)

    사업연도id = 사업연도_삽입(conn, 회사id, data["회사"], 전기사업연도id)
    새자산매핑 = _자식들_삽입(conn, 사업연도id, data, 전기자산_매핑)
    return 사업연도id, 새자산매핑


def _검증_통과확인(data: dict, 라벨: str) -> None:
    v = 검증(재무상태표=data["재무상태표"], 손익계산서=data["손익계산서"], 자산대장=data["자산대장"])
    if not v["ok"]:
        실패내역 = "; ".join(f"{c['name']} — {c['detail']}" for c in v["checks"] if not c["ok"])
        raise 검증실패(f"{라벨}: 입력 무결성 검증 실패 — {실패내역}")


def _자식들_삽입(conn: 연결, 사업연도id: int, data: dict, 전기자산_매핑: dict[str, int]) -> dict[str, int]:
    if data["재무상태표"]:
        재무상태표_삽입(conn, 사업연도id, data["재무상태표"])
    손익계산서_삽입(conn, 사업연도id, data["손익계산서"])
    새자산매핑 = 자산_삽입(conn, 사업연도id, data["자산대장"], 전기자산_매핑)
    if data["차량대장"]:
        차량_삽입(conn, 사업연도id, data["차량대장"])
    세무조정_삽입(conn, 사업연도id, data["조정"])
    정답지_삽입(conn, 사업연도id, data["정답"])
    return 새자산매핑


def 데이터_재이관(conn: 연결, 사업연도id: int, data: dict, *, 라벨: str = "입력") -> dict[str, int]:
    """기존 사업연도의 입력을 통째로 교체한다(재제출) — FE가 수정 후 다시 계산할 때 쓴다.

    사업연도 행은 UPDATE(id 유지 — 계산스냅샷 이력·전기 체인이 이 id를 가리키므로), 자식
    행(재무제표·자산·차량·조정·정답지)은 삭제 후 재삽입한다. 계산스냅샷은 append-only
    감사 이력이라 지우지 않는다 — "수정 전 입력으로 계산했던 기록"도 이력의 일부다.
    다음 연도 자산이 이 연도의 자산 행을 전기자산id로 가리키고 있었다면 그 연결은 NULL로
    풀린다(ON DELETE SET NULL) — 최신 연도를 고치는 일반 시나리오에서는 발생하지 않는다.
    검증실패 시 아무것도 지우기 전에 던지므로 호출자는 롤백만 하면 된다.
    """
    _검증_통과확인(data, 라벨)

    row = conn.execute(
        "SELECT 회사id, 전기사업연도id FROM 사업연도 WHERE id = ?", (사업연도id,)
    ).fetchone()
    if row is None:
        raise ValueError(f"사업연도id {사업연도id}를 찾을 수 없음")
    _, 전기사업연도id = row

    사업연도_갱신(conn, 사업연도id, data["회사"])
    for 테이블 in ("재무상태표항목", "손익계산서항목", "자산", "차량", "세무조정", "정답지"):
        conn.execute(f"DELETE FROM {테이블} WHERE 사업연도id = ?", (사업연도id,))  # 내부 리터럴만

    전기자산_매핑 = 자산_명_매핑(conn, 전기사업연도id)
    return _자식들_삽입(conn, 사업연도id, data, 전기자산_매핑)


def 폴더_이관(conn: 연결, 회사id: int, folder: Path,
           전기사업연도id: int | None, 전기자산_매핑: dict[str, int]) -> tuple[int, dict[str, int]]:
    """사업연도 폴더 하나(CSV)를 로드해 데이터_이관()에 넘긴다."""
    return 데이터_이관(conn, 회사id, 로드(folder), 전기사업연도id, 전기자산_매핑, 라벨=str(folder))


# ── 전체 이관 오케스트레이션 ──────────────────────────────────────────

def 이관(
    conn: 연결,
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
            # "이미 연결돼 있으면 무시" — 방언이 갈리는 유일한 지점이라 여기서만 분기한다.
            if PG인가(conn):
                conn.execute(
                    "INSERT INTO 회사_사용자 (회사id, 사용자id, 역할) VALUES (?, ?, 'owner')"
                    " ON CONFLICT DO NOTHING",
                    (회사id, 사용자id),
                )
            else:
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
