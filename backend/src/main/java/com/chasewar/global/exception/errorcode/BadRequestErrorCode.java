package com.chasewar.global.exception.errorcode;

import org.springframework.http.HttpStatus;

public enum BadRequestErrorCode implements ErrorCode {

    MISSING_REQUEST_PARAMETER("필수 요청 파라미터가 없습니다.");

    private static final HttpStatus status = HttpStatus.BAD_REQUEST;

    private final String message;

    BadRequestErrorCode(String message) {
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
