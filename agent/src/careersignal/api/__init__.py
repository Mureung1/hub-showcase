"""FastAPI 앱 조립.

`agent/main.py` 는 여기서 `app` 을 가져오기만 한다(CONTRACT 7장). 라우트 정의는
라우터 모듈에, 저장소 조립은 `deps.py` 에 있고, 이 모듈은 그것을 붙이는 일만 한다.

`routes_user_posting` 은 다른 갈래(B12)가 만든다. 있으면 등록하고 없으면 건너뛴다.
없다고 앱이 뜨지 않으면 두 갈래가 서로의 병합을 기다려야 하고, 그동안 나머지 네
라우트도 함께 멈춘다. 건너뛰기는 `ImportError` 만 삼킨다 — 그 모듈 안의 다른 실수는
`ImportError` 가 아닌 예외로 올라오므로 조용히 묻히지 않는다.
"""

from __future__ import annotations

from fastapi import FastAPI

from careersignal.api import routes_analysis
from careersignal.api.deps import ServiceUnavailable, service_unavailable_handler

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
