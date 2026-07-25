package com.chasewar.global.exception.errorcode;

import org.springframework.http.HttpStatus;

public enum NotFoundErrorCode implements ErrorCode {

    NOT_FOUND_PARKING_LOT("주차장을 찾을 수 없습니다.");

    private static final HttpStatus status = HttpStatus.NOT_FOUND;

    private final String message;

    NotFoundErrorCode(String message) {
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
