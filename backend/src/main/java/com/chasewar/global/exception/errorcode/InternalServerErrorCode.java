package com.chasewar.global.exception.errorcode;

import org.springframework.http.HttpStatus;

public enum InternalServerErrorCode implements ErrorCode {

    INTERNAL_SERVER_ERROR("서버 내부 오류가 발생했습니다."),
    INVALID_COORDINATES("좌표 데이터가 올바르지 않습니다."),
    MISSING_PARKING_LOT_CODE("주차장 코드가 없습니다."),
    INVALID_FEE("요금 데이터가 올바르지 않습니다."),
    INVALID_TOTAL_SLOTS("총 주차면수가 올바르지 않습니다."),
    INVALID_AVAILABLE_SLOTS("실시간 가용 면수가 올바르지 않습니다.");

    private static final HttpStatus status = HttpStatus.INTERNAL_SERVER_ERROR;

    private final String message;

    InternalServerErrorCode(String message) {
        this.message = message;
    }

    @Override
    public HttpStatus getStatus() {
        return status;
    }

    @Override
    public String getMessage() {
        return message;
    }
}
