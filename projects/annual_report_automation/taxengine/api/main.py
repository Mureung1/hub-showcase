"""TaxWiz API — taxengine을 감싸는 얇은 HTTP 계층.

    python -m taxengine.api.main            # http://127.0.0.1:8000 , 문서는 /docs
    TAXWIZ_DB=path/to.db python -m taxengine.api.main   # DB 파일 경로 지정(기본 taxengine/db/taxwiz.db)

⚠️ 지금은 "연결 지점만" 만들어둔 것이다(2026-07-20) — 실제 프론트엔드(taxwiz-fe/)와의 연결은
FE가 어느 정도 만들어진 뒤 진행하기로 했다(taxwiz-fe/README.md 참고). 그래서:
  · CORS는 지금 전부 허용(`*`) — FE origin이 정해지면 좁혀야 한다.
  · 인증/세션이 없다 — 스키마의 `사용자`/`회사_사용자`는 의도적으로 범위 밖(과설계 회피,
    notes/DB-스키마-설계.md §3.1)이라 이 API도 그대로 따른다.
  · 새 엔드포인트가 필요해지면 그때 늘린다 — 지금 것만으로 "회사 만들기 → 사업연도 입력 →
    계산 → 이력 조회"라는 한 바퀴는 돈다(tests/test_api.py로 확인).

라우트가 하는 일은 대부분 기존 모듈(taxengine.db.migrate/reader/snapshot, taxengine.pipeline)
호출 한 줄이다 — 이 파일 자체에는 비즈니스 로직을 새로 안 만든다.
"""

from __future__ import annotations

import os
import sqlite3
from pathlib import Path
from typing import Generator

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from taxengine.api.schemas import 사업연도생성요청, 회사생성요청
from taxengine.db.migrate import (
    검증실패,
    db_열기,
    데이터_이관,
    자산_명_매핑,
    최근_사업연도_찾기,
    회사_생성,
)
from taxengine.db.reader import 로드 as db_로드
from taxengine.db.snapshot import 저장 as 스냅샷_저장
from taxengine.pipeline import 실행_데이터

DB_PATH = Path(os.environ.get("TAXWIZ_DB", "taxengine/db/taxwiz.db"))


def get_conn() -> Generator[sqlite3.Connection, None, None]:
    """요청마다 새 연결을 열고 끝나면 닫는다 — sqlite3 커넥션은 스레드 간 공유하지 않는다."""
    conn = db_열기(DB_PATH)
    try:
        yield conn
    finally:
        conn.close()


app = FastAPI(
    title="TaxWiz API",
    description="법인세 조정 엔진(taxengine)을 감싸는 API. 프론트엔드 연결은 추후 진행 — taxwiz-fe/README.md 참고.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: FE origin이 정해지면 좁힐 것
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def 상태확인():
    return {"status": "ok"}


# ── 회사 ──────────────────────────────────────────────────────────────

@app.post("/companies", status_code=201)
def 회사_만들기(요청: 회사생성요청, conn: sqlite3.Connection = Depends(get_conn)):
    회사id = 회사_생성(conn, 요청.회사명)
    conn.commit()
    return {"id": 회사id, "회사명": 요청.회사명}


@app.get("/companies")
def 회사_목록(conn: sqlite3.Connection = Depends(get_conn)):
    rows = conn.execute("SELECT id, 회사명 FROM 회사 ORDER BY id").fetchall()
    return [{"id": r[0], "회사명": r[1]} for r in rows]


# ── 사업연도 ──────────────────────────────────────────────────────────

@app.post("/companies/{company_id}/fiscal-years", status_code=201)
def 사업연도_만들기(
    company_id: int, 요청: 사업연도생성요청, conn: sqlite3.Connection = Depends(get_conn)
):
    if conn.execute("SELECT 1 FROM 회사 WHERE id = ?", (company_id,)).fetchone() is None:
        raise HTTPException(404, f"회사id {company_id}를 찾을 수 없음")

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


@app.get("/companies/{company_id}/fiscal-years")
def 사업연도_목록(company_id: int, conn: sqlite3.Connection = Depends(get_conn)):
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
def 사업연도_상세(fiscal_year_id: int, conn: sqlite3.Connection = Depends(get_conn)):
    try:
        return db_로드(conn, fiscal_year_id)
    except ValueError as e:
        raise HTTPException(404, str(e)) from e


# ── 계산 ──────────────────────────────────────────────────────────────

@app.post("/fiscal-years/{fiscal_year_id}/calculate")
def 계산_실행(fiscal_year_id: int, conn: sqlite3.Connection = Depends(get_conn)):
    """DB에 저장된 입력으로 세무조정을 계산하고, 결과를 계산스냅샷에 append한다."""
    try:
        data = db_로드(conn, fiscal_year_id)
    except ValueError as e:
        raise HTTPException(404, str(e)) from e

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
def 스냅샷_목록(fiscal_year_id: int, conn: sqlite3.Connection = Depends(get_conn)):
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
