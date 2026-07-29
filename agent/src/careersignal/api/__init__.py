"""FastAPI 앱 조립.

`agent/main.py` 는 여기서 `app` 을 가져오기만 한다(CONTRACT 7장). 라우트 정의는
라우터 모듈에, 저장소 조립은 `deps.py` 에 있고, 이 모듈은 그것을 붙이는 일만 한다.

`routes_user_posting` 은 다른 갈래(B12)가 만든다. 있으면 등록하고 없으면 건너뛴다.
없다고 앱이 뜨지 않으면 두 갈래가 서로의 병합을 기다려야 하고, 그동안 나머지 네
라우트도 함께 멈춘다. 건너뛰기는 `ImportError` 만 삼킨다 — 그 모듈 안의 다른 실수는
`ImportError` 가 아닌 예외로 올라오므로 조용히 묻히지 않는다.

이 모듈이 `agent/.env` 를 읽는다. 저장소 접속 문자열은 `repositories/base.py` 가
`SUPABASE_DB_URL` 환경변수에서만 읽는데, 그 변수를 실행 환경에 올리는 것은 프로세스
진입점의 몫이다. `scripts/` 의 운영자 도구는 각자 `load_dotenv` 를 부르고, 앱의
진입점은 여기다. 배포 환경처럼 `.env` 파일이 없고 환경변수가 이미 올라와 있으면
`load_dotenv` 는 아무것도 덮지 않는다.
"""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI

AGENT_ROOT = Path(__file__).resolve().parents[3]
"""`agent/` 폴더. `src/careersignal/api/` 에서 세 단계 위다."""


def _load_environment() -> None:
    """`agent/.env` 를 읽는다. 파일도 python-dotenv 도 없으면 조용히 넘어간다.

    이미 올라와 있는 환경변수를 덮지 않는다(`override=False` 가 기본값). 배포
    환경에서는 플랫폼이 넣은 값이 우선이다.
    """
    try:
        from dotenv import load_dotenv
    except ImportError:  # 배포 환경은 환경변수를 직접 올린다
        return
    load_dotenv(AGENT_ROOT / ".env")


_load_environment()

from careersignal.api import routes_analysis  # noqa: E402  환경변수를 먼저 올린다
from careersignal.api.deps import (  # noqa: E402
    ServiceUnavailable,
    service_unavailable_handler,
)

app = FastAPI(title="CareerSignal Agent", version="0.1.0")
app.add_exception_handler(ServiceUnavailable, service_unavailable_handler)
app.include_router(routes_analysis.router)

try:
    from careersignal.api import routes_user_posting
except ImportError:  # B12 가 아직 없다. 나머지 라우트는 그대로 뜬다.
    pass
else:
    app.include_router(routes_user_posting.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "agent"}


__all__ = ["app", "health"]
