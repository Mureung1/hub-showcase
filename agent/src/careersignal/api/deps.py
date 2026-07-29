"""라우터가 받는 의존성과 그 조립.

라우트 함수는 저장소를 만들지 않는다. 여기서 `unit_of_work` 로 거래를 열고 저장소를
세워 넘긴다. 그래서 라우트는 psycopg 를 모르고, 검사는 이 자리만 대역으로 갈아
끼우면 데이터베이스 없이 라우트 전체를 돌릴 수 있다
(`app.dependency_overrides[serving_repository]`).

거래의 수명은 요청 하나다. `yield` 앞뒤가 `with` 이므로 응답이 나간 뒤 거래가 닫힌다.
구성요소는 `Component.SERVING` 이고 쓰기 범위가 비어 있다
(`domain/permissions.py`). 화면 조회 경로에서 무엇이 저장되는 일이 생기면 코드가
아니라 데이터베이스 role 이 먼저 막는다.
"""

from __future__ import annotations

from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends, Request
from fastapi.responses import JSONResponse

from careersignal.agents.statistics.extractor import MentionExtractor
from careersignal.domain.permissions import Component
from careersignal.repositories.base import Unit, unit_of_work
from careersignal.repositories.serving import ServingRepository

NO_ACTIVE_ANALYSIS = "NO_ACTIVE_ANALYSIS"
"""저장된 활성 결과가 없다. CONTRACT 7장이 정한 코드다."""

NO_EXTRACTOR = "EXTRACTOR_NOT_CONFIGURED"
"""추출 판정자가 주입되지 않았다."""

SERVICE_UNAVAILABLE = 503


class ServiceUnavailable(Exception):
    """지금 답할 수 없다는 것을 코드와 함께 알린다.

    조용히 빈 배열을 돌려주지 않는다. 빈 목록은 "요구가 없는 직무"와 "아직 저장이
    없는 직무"를 구별하지 못하고, 화면은 앞의 것으로 그린다.
    """

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def service_unavailable_handler(request: Request, exc: Exception) -> JSONResponse:
    """`{"error": {"code", "message"}}` 한 모양으로 낸다.

    서명이 `Exception` 인 것은 FastAPI 의 처리기 계약이다. 등록한 예외만 여기로
    오지만, 아닌 것이 오면 삼키지 않고 올린다 — 코드가 없는 실패를 코드 있는 응답
    으로 위장하면 화면이 잘못된 사유를 표시한다.
    """
    if not isinstance(exc, ServiceUnavailable):
        raise exc
    return JSONResponse(
        status_code=SERVICE_UNAVAILABLE,
        content={"error": {"code": exc.code, "message": exc.message}},
    )


# ------------------------------------------------------------------ 저장소
def serving_unit() -> Iterator[Unit]:
    """요청 하나 동안 열려 있는 서빙 거래."""
    with unit_of_work(Component.SERVING) as unit:
        yield unit


def serving_repository(unit: Annotated[Unit, Depends(serving_unit)]) -> ServingRepository:
    return ServingRepository(unit)


Serving = Annotated[ServingRepository, Depends(serving_repository)]


# ------------------------------------------------------------------ 추출 판정자
def mention_extractor() -> MentionExtractor | None:
    """요구 표현 추출 포트. 기본값은 **미주입**이다.

    기본값을 `OpenAIMentionExtractor` 로 두지 않는다. 그러면 설정을 잊은 배포가
    조용히 모델을 부르고 비용과 지연이 화면 요청마다 붙는다. 주입은 배선하는
    쪽이 `app.dependency_overrides` 로 명시한다. 미주입이면 라우트가 503 과
    `EXTRACTOR_NOT_CONFIGURED` 를 낸다.
    """
    return None


Extractor = Annotated[MentionExtractor | None, Depends(mention_extractor)]


__all__ = [
    "Extractor",
    "NO_ACTIVE_ANALYSIS",
    "NO_EXTRACTOR",
    "SERVICE_UNAVAILABLE",
    "Serving",
    "ServiceUnavailable",
    "mention_extractor",
    "service_unavailable_handler",
    "serving_repository",
    "serving_unit",
]
