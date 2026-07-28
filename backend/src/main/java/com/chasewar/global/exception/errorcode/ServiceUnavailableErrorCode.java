package com.chasewar.global.exception.errorcode;

import org.springframework.http.HttpStatus;

public enum ServiceUnavailableErrorCode implements ErrorCode{

    EXTERNAL_SERVER_UNAVAILABLE("외부 서비스에 일시적으로 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");

    private static final HttpStatus status = HttpStatus.SERVICE_UNAVAILABLE;

    private final String message;

    ServiceUnavailableErrorCode(String message) {
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
