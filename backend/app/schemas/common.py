from pydantic import BaseModel


class ErrorDetail(BaseModel):
    """검증 실패의 필드별 원인."""

    field: str
    reason: str


class ErrorResponse(BaseModel):
    """공통 에러 응답 외피. api-spec.md의 { code, message, details? }.

    DB 오류 메시지, SQL, 스택 트레이스, 토큰은 여기에 담지 않는다.
    """

    code: str
    message: str
    details: list[ErrorDetail] | None = None
