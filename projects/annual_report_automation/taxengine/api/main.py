"""TaxWiz API — taxengine을 감싸는 얇은 HTTP 계층.

    python -m taxengine.api.main            # http://127.0.0.1:8000 , 문서는 /docs
    TAXWIZ_DB=path/to.db python -m taxengine.api.main   # SQLite 파일 경로 지정(기본 taxengine/db/taxwiz.db)
    TAXWIZ_DATABASE_URL=postgresql://... python -m taxengine.api.main   # Supabase(Postgres) — SQLite보다 우선

2026-07-22 갱신 — 인증·스코핑이 붙었다:
  · 인증: Supabase Auth JWT(Bearer) 검증 — taxengine/api/auth.py. `/health`만 공개.
  · 스코핑: 모든 데이터 엔드포인트는 `회사_사용자`로 접근 범위를 좁힌다(내 회사만 보인다).
  · CORS: FE dev origin(기본 http://localhost:5173)만 허용 — TAXWIZ_FRONTEND_ORIGIN으로 변경.
  · 새 엔드포인트가 필요해지면 그때 늘린다 — 지금 것만으로 "회사 만들기 → 사업연도 입력 →
    계산 → 이력 조회"라는 한 바퀴는 돈다(tests/test_api.py로 확인).

라우트가 하는 일은 대부분 기존 모듈(taxengine.db.migrate/reader/snapshot, taxengine.pipeline)
호출 한 줄이다 — 이 파일 자체에는 비즈니스 로직을 새로 안 만든다.
"""

from __future__ import annotations

import os

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from taxengine.api.auth import 현재사용자
from taxengine.api.deps import get_conn  # re-export — tests/test_api.py가 main에서 import한다
from taxengine.api.schemas import 사업연도생성요청, 회사생성요청, 회사수정요청
from taxengine.db.conn import 연결
from taxengine.db.migrate import (
    검증실패,
    데이터_이관,
    데이터_재이관,
    자산_명_매핑,
    최근_사업연도_찾기,
    회사_생성,
    회사_프로필_갱신,
)
from taxengine.db.reader import 로드 as db_로드, 회사_프로필
from taxengine.db.snapshot import 저장 as 스냅샷_저장
from taxengine.pipeline import 실행_데이터


app = FastAPI(
    title="TaxWiz API",
    description="법인세 조정 엔진(taxengine)을 감싸는 API. 프론트엔드 연결은 추후 진행 — taxwiz-fe/README.md 참고.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    # FE(Vite dev 서버) origin만 허용. 배포 origin이 생기면 환경변수로 바꾼다.
    allow_origins=[os.environ.get("TAXWIZ_FRONTEND_ORIGIN", "http://localhost:5173")],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── 접근 범위 헬퍼 — 모든 데이터 엔드포인트는 회사_사용자로 스코핑된다 ──────────
# 남의 회사id를 넣어도 "없음"과 같은 404를 돌려준다(403으로 존재 여부를 흘리지 않는다).

def _회사_접근확인(conn: 연결, 회사id: int, 사용자id: int) -> None:
    row = conn.execute(
        "SELECT 1 FROM 회사_사용자 WHERE 회사id = ? AND 사용자id = ?", (회사id, 사용자id)
    ).fetchone()
    if row is None:
        raise HTTPException(404, f"회사id {회사id}를 찾을 수 없음")


def _사업연도_접근확인(conn: 연결, 사업연도id: int, 사용자id: int) -> None:
    row = conn.execute("SELECT 회사id FROM 사업연도 WHERE id = ?", (사업연도id,)).fetchone()
    if row is None:
        raise HTTPException(404, f"사업연도id {사업연도id}를 찾을 수 없음")
    _회사_접근확인(conn, row[0], 사용자id)


@app.get("/health")
def 상태확인():
    """공개 엔드포인트 — 인증 불필요. 그 외 전부는 Bearer 토큰이 필요하다(auth.py)."""
    return {"status": "ok"}


# ── 회사 ──────────────────────────────────────────────────────────────

@app.post("/companies", status_code=201)
def 회사_만들기(요청: 회사생성요청, conn: 연결 = Depends(get_conn), 사용자: dict = Depends(현재사용자)):
    회사id = 회사_생성(conn, 요청.회사명, 프로필=요청.model_dump(exclude={"회사명"}))
    conn.execute(  # 만든 사람이 owner — 이후 모든 접근 확인의 근거가 되는 행
        "INSERT INTO 회사_사용자 (회사id, 사용자id, 역할) VALUES (?, ?, 'owner')",
        (회사id, 사용자["id"]),
    )
    conn.commit()
    return 회사_프로필(conn, 회사id)


@app.get("/companies/{company_id}")
def 회사_상세(company_id: int, conn: 연결 = Depends(get_conn), 사용자: dict = Depends(현재사용자)):
    """회사 "거의 고정" 프로필 + 지배주주 명단 — 매년 위저드의 "작년과 같나요?" 화면용."""
    _회사_접근확인(conn, company_id, 사용자["id"])
    return 회사_프로필(conn, company_id)


@app.patch("/companies/{company_id}")
def 회사_수정(
    company_id: int, 요청: 회사수정요청,
    conn: 연결 = Depends(get_conn), 사용자: dict = Depends(현재사용자),
):
    """보낸 필드만 반영하는 부분 수정 — 프로필이 바뀌었을 때(온보딩 이후) 쓴다."""
    _회사_접근확인(conn, company_id, 사용자["id"])
    변경 = 요청.model_dump(exclude_unset=True)
    if "회사명" in 변경 and 변경["회사명"] is not None:
        conn.execute("UPDATE 회사 SET 회사명 = ? WHERE id = ?", (변경.pop("회사명"), company_id))
    else:
        변경.pop("회사명", None)
    회사_프로필_갱신(conn, company_id, 변경)
    conn.commit()
    return 회사_프로필(conn, company_id)


@app.get("/companies")
def 회사_목록(conn: 연결 = Depends(get_conn), 사용자: dict = Depends(현재사용자)):
    rows = conn.execute(
        """SELECT 회사.id, 회사.회사명 FROM 회사
           JOIN 회사_사용자 ON 회사_사용자.회사id = 회사.id
           WHERE 회사_사용자.사용자id = ? ORDER BY 회사.id""",
        (사용자["id"],),
    ).fetchall()
    return [{"id": r[0], "회사명": r[1]} for r in rows]


# ── 사업연도 ──────────────────────────────────────────────────────────

@app.post("/companies/{company_id}/fiscal-years", status_code=201)
def 사업연도_만들기(
    company_id: int, 요청: 사업연도생성요청,
    conn: 연결 = Depends(get_conn), 사용자: dict = Depends(현재사용자),
):
    _회사_접근확인(conn, company_id, 사용자["id"])

    # 같은 종료일의 사업연도가 이미 있으면 DB UNIQUE 제약(500)까지 가기 전에 409로 안내 —
    # FE는 이 id로 PUT(재제출)하면 된다.
    중복 = conn.execute(
        "SELECT id FROM 사업연도 WHERE 회사id = ? AND 사업연도종료일 = ?",
        (company_id, 요청.회사.사업연도종료일),
    ).fetchone()
    if 중복:
        raise HTTPException(
            409, f"같은 종료일의 사업연도가 이미 있음(id={중복[0]}) — PUT으로 재제출하세요"
        )

    전기사업연도id = 최근_사업연도_찾기(conn, company_id)
    전기자산_매핑 = 자산_명_매핑(conn, 전기사업연도id)
    try:
        사업연도id, _ = 데이터_이관(
            conn, company_id, 요청.model_dump(), 전기사업연도id, 전기자산_매핑,
            라벨=f"company_id={company_id}",
        )
    except 검증실패 as e:
        conn.rollback()
        raise HTTPException(422, str(e)) from e

    conn.commit()
    return {"id": 사업연도id, "회사id": company_id, "전기사업연도id": 전기사업연도id}


@app.put("/companies/{company_id}/fiscal-years/{fiscal_year_id}")
def 사업연도_재제출(
    company_id: int, fiscal_year_id: int, 요청: 사업연도생성요청,
    conn: 연결 = Depends(get_conn), 사용자: dict = Depends(현재사용자),
):
    """기존 사업연도의 입력을 통째로 교체한다 — "수정 후 다시 계산" 흐름.

    id가 유지되므로 계산스냅샷 이력·전기 체인이 끊기지 않는다. 계산할 때마다 회사·사업연도가
    새로 생기던 기존 FE 문제(수정 API 부재)의 근본 해결책.
    """
    _회사_접근확인(conn, company_id, 사용자["id"])
    row = conn.execute(
        "SELECT 1 FROM 사업연도 WHERE id = ? AND 회사id = ?", (fiscal_year_id, company_id)
    ).fetchone()
    if row is None:
        raise HTTPException(404, f"사업연도id {fiscal_year_id}를 찾을 수 없음")

    try:
        데이터_재이관(conn, fiscal_year_id, 요청.model_dump(), 라벨=f"fiscal_year_id={fiscal_year_id}")
    except 검증실패 as e:
        conn.rollback()
        raise HTTPException(422, str(e)) from e

    conn.commit()
    return {"id": fiscal_year_id, "회사id": company_id}


@app.get("/companies/{company_id}/fiscal-years")
def 사업연도_목록(
    company_id: int, conn: 연결 = Depends(get_conn), 사용자: dict = Depends(현재사용자)
):
    _회사_접근확인(conn, company_id, 사용자["id"])
    rows = conn.execute(
        """SELECT id, 사업연도개시일, 사업연도종료일, 전기사업연도id
           FROM 사업연도 WHERE 회사id = ? ORDER BY 사업연도종료일""",
        (company_id,),
    ).fetchall()
    return [
        {"id": r[0], "사업연도개시일": r[1], "사업연도종료일": r[2], "전기사업연도id": r[3]}
        for r in rows
    ]


@app.get("/fiscal-years/{fiscal_year_id}")
def 사업연도_상세(
    fiscal_year_id: int, conn: 연결 = Depends(get_conn), 사용자: dict = Depends(현재사용자)
):
    _사업연도_접근확인(conn, fiscal_year_id, 사용자["id"])
    return db_로드(conn, fiscal_year_id)


# ── 계산 ──────────────────────────────────────────────────────────────

@app.post("/fiscal-years/{fiscal_year_id}/calculate")
def 계산_실행(
    fiscal_year_id: int, conn: 연결 = Depends(get_conn), 사용자: dict = Depends(현재사용자)
):
    """DB에 저장된 입력으로 세무조정을 계산하고, 결과를 계산스냅샷에 append한다."""
    _사업연도_접근확인(conn, fiscal_year_id, 사용자["id"])
    data = db_로드(conn, fiscal_year_id)

    out = 실행_데이터(data)
    if not out["v"]["ok"]:
        raise HTTPException(422, {
            "message": "입력 무결성 검증 실패",
            "checks": [c for c in out["v"]["checks"] if not c["ok"]],
        })

    스냅샷id = 스냅샷_저장(conn, fiscal_year_id, out)
    conn.commit()

    r = out["r"]
    return {
        "스냅샷id": 스냅샷id,
        "각사업연도소득": int(r["각사업연도소득"]), "과세표준": int(r["과세표준"]),
        "산출세액": int(r["산출세액"]), "차감납부세액": int(r["차감납부세액"]),
        "총납부세액": int(r["총납부세액"]),
    }


@app.get("/fiscal-years/{fiscal_year_id}/snapshots")
def 스냅샷_목록(
    fiscal_year_id: int, conn: 연결 = Depends(get_conn), 사용자: dict = Depends(현재사용자)
):
    _사업연도_접근확인(conn, fiscal_year_id, 사용자["id"])
    rows = conn.execute(
        """SELECT id, 계산일시, 차감납부세액, 엔진버전
           FROM 계산스냅샷 WHERE 사업연도id = ? ORDER BY 계산일시 DESC""",
        (fiscal_year_id,),
    ).fetchall()
    return [{"id": r[0], "계산일시": r[1], "차감납부세액": r[2], "엔진버전": r[3]} for r in rows]


def main():
    import uvicorn
    uvicorn.run("taxengine.api.main:app", host="127.0.0.1", port=8000, reload=True)


if __name__ == "__main__":
    main()
