"""Supabase Auth JWT 검증 — `Authorization: Bearer <token>`을 `사용자` 행으로 연결한다.

구조: FE는 supabase-js로 로그인해 access token(JWT)만 얻고, 데이터 요청은 전부 이
FastAPI로 보낸다. 여기서 토큰 서명을 검증하고, 토큰의 sub(Supabase auth user id)를
`사용자.auth_uid`로 upsert해 우리 DB의 사용자 행과 연결한다 — 이후 엔드포인트는
`회사_사용자`로 접근 범위를 좁힌다(main.py).

환경변수 (검증 방식 — 프로젝트 대시보드 Settings→JWT Keys에서 어느 쪽인지 확인):
  SUPABASE_URL         https://<project-ref>.supabase.co
                       → 비대칭키(ES256/RS256, 2026년 신규 프로젝트 기본)를 JWKS로 검증. 1순위.
  SUPABASE_JWT_SECRET  레거시 HS256 프로젝트의 JWT Secret — JWKS 검증이 안 될 때 폴백.

둘 다 없으면 503을 돌려준다 — 설정을 깜빡했을 때 엔드포인트가 조용히 열려 있는 것보다
시끄럽게 실패하는 쪽이 안전하다. 테스트는 이 dependency를 통째로 override한다(tests/test_api.py).
"""

from __future__ import annotations

import os
from functools import lru_cache

from fastapi import Depends, Header, HTTPException

from taxengine.api.deps import get_conn
from taxengine.db.conn import 삽입후id, 연결


@lru_cache(maxsize=1)
def _jwks_클라이언트(supabase_url: str):
    """JWKS(공개키 목록) 클라이언트 — PyJWKClient가 내부 캐싱하므로 프로세스당 1개면 된다."""
    from jwt import PyJWKClient

    return PyJWKClient(f"{supabase_url}/auth/v1/.well-known/jwks.json")


def _클레임_검증(token: str) -> dict:
    """토큰 서명·aud·iss를 검증하고 클레임(dict)을 돌려준다. 실패하면 401."""
    import jwt

    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    secret = os.environ.get("SUPABASE_JWT_SECRET")
    if not supabase_url and not secret:
        raise HTTPException(503, "인증 미설정 — SUPABASE_URL 또는 SUPABASE_JWT_SECRET 환경변수가 필요함")

    공통 = {"audience": "authenticated"}
    if supabase_url:
        공통["issuer"] = f"{supabase_url}/auth/v1"

    마지막오류: Exception | None = None
    if supabase_url:  # 1순위: 비대칭키(JWKS)
        try:
            key = _jwks_클라이언트(supabase_url).get_signing_key_from_jwt(token).key
            return jwt.decode(token, key, algorithms=["ES256", "RS256"], **공통)
        except Exception as e:  # JWKS 접속 실패·kid 불일치·서명 불일치 — HS256 폴백 시도
            마지막오류 = e
    if secret:  # 폴백: 레거시 HS256
        try:
            return jwt.decode(token, secret, algorithms=["HS256"], **공통)
        except Exception as e:
            마지막오류 = e
    raise HTTPException(401, f"토큰 검증 실패: {마지막오류}")


def 현재사용자(
    authorization: str | None = Header(default=None),
    conn: 연결 = Depends(get_conn),
) -> dict:
    """요청의 Bearer 토큰을 검증해 {id, 이메일, auth_uid}를 돌려준다.

    사용자 행 연결 규칙:
      1. auth_uid가 일치하는 행이 있으면 그 행 (평소 경로)
      2. 없지만 이메일이 일치하는 행이 있으면 그 행에 auth_uid를 채움
         (cli/migrate.py --owner-email로 먼저 만들어진 행과의 이어붙이기)
      3. 둘 다 없으면 새로 만든다 (최초 로그인)
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Authorization: Bearer <token> 헤더가 필요함")
    클레임 = _클레임_검증(authorization[len("Bearer "):])

    auth_uid = 클레임.get("sub")
    if not auth_uid:
        raise HTTPException(401, "토큰에 sub 클레임이 없음")
    이메일 = 클레임.get("email") or f"{auth_uid}@auth.local"

    row = conn.execute("SELECT id, 이메일 FROM 사용자 WHERE auth_uid = ?", (auth_uid,)).fetchone()
    if row:
        return {"id": row[0], "이메일": row[1], "auth_uid": auth_uid}

    row = conn.execute("SELECT id FROM 사용자 WHERE 이메일 = ?", (이메일,)).fetchone()
    if row:
        conn.execute("UPDATE 사용자 SET auth_uid = ? WHERE id = ?", (auth_uid, row[0]))
        conn.commit()
        return {"id": row[0], "이메일": 이메일, "auth_uid": auth_uid}

    사용자id = 삽입후id(conn, "INSERT INTO 사용자 (이메일, auth_uid) VALUES (?, ?)", (이메일, auth_uid))
    conn.commit()
    return {"id": 사용자id, "이메일": 이메일, "auth_uid": auth_uid}
