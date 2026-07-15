"""공통 에러 처리. 모든 에러 응답을 { code, message, details? } 외피로 통일한다."""

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.schemas.common import ErrorDetail, ErrorResponse

# starlette 최신에서 HTTP_422_UNPROCESSABLE_ENTITY가 이름 변경 예정이라 값을 직접 쓴다.
HTTP_422 = 422

# HTTP 상태 코드 → 공통 code 문자열. api-spec.md의 공통 에러 표와 일치한다.
STATUS_TO_CODE: dict[int, str] = {
    status.HTTP_400_BAD_REQUEST: "INVALID_REQUEST",
    status.HTTP_401_UNAUTHORIZED: "UNAUTHORIZED",
    status.HTTP_403_FORBIDDEN: "FORBIDDEN",
    status.HTTP_404_NOT_FOUND: "NOT_FOUND",
    status.HTTP_409_CONFLICT: "CONFLICT",
    HTTP_422: "VALIDATION_ERROR",
    status.HTTP_429_TOO_MANY_REQUESTS: "RATE_LIMITED",
    status.HTTP_500_INTERNAL_SERVER_ERROR: "INTERNAL_ERROR",
}

DEFAULT_MESSAGE: dict[int, str] = {
    status.HTTP_400_BAD_REQUEST: "요청을 처리할 수 없습니다.",
    status.HTTP_401_UNAUTHORIZED: "로그인이 필요합니다.",
    status.HTTP_403_FORBIDDEN: "권한이 없습니다.",
    status.HTTP_404_NOT_FOUND: "찾을 수 없습니다.",
    status.HTTP_409_CONFLICT: "현재 상태와 요청이 충돌합니다.",
    HTTP_422: "요청 값을 확인해 주세요.",
    status.HTTP_429_TOO_MANY_REQUESTS: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
    status.HTTP_500_INTERNAL_SERVER_ERROR: "일시적인 오류가 발생했습니다.",
}


class ApiError(Exception):
    """도메인 코드에서 발생시키는 에러. 상태 코드와 사용자용 메시지를 담는다."""

    def __init__(
        self,
        status_code: int,
        message: str | None = None,
        details: list[ErrorDetail] | None = None,
    ) -> None:
        self.status_code = status_code
        self.message = message or DEFAULT_MESSAGE.get(status_code, "오류가 발생했습니다.")
        self.details = details
        super().__init__(self.message)


def _error_body(status_code: int, message: str, details: list[ErrorDetail] | None) -> dict:
    code = STATUS_TO_CODE.get(status_code, "INTERNAL_ERROR")
    return ErrorResponse(code=code, message=message, details=details).model_dump(
        exclude_none=True
    )


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def handle_api_error(_: Request, exc: ApiError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_body(exc.status_code, exc.message, exc.details),
        )

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_exception(
        _: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        message = exc.detail if isinstance(exc.detail, str) else DEFAULT_MESSAGE.get(
            exc.status_code, "오류가 발생했습니다."
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_body(exc.status_code, message, None),
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        _: Request, exc: RequestValidationError
    ) -> JSONResponse:
        details = [
            ErrorDetail(
                field=".".join(str(part) for part in error["loc"] if part != "body"),
                reason=error["msg"],
            )
            for error in exc.errors()
        ]
        return JSONResponse(
            status_code=HTTP_422,
            content=_error_body(
                HTTP_422,
                DEFAULT_MESSAGE[HTTP_422],
                details,
            ),
        )

    @app.exception_handler(Exception)
    async def handle_unexpected(_: Request, exc: Exception) -> JSONResponse:
        # 예상하지 못한 오류. 내부 메시지를 노출하지 않는다.
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_error_body(
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                DEFAULT_MESSAGE[status.HTTP_500_INTERNAL_SERVER_ERROR],
                None,
            ),
        )
