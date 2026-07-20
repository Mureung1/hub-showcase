package com.chasewar.global.exception.errorcode;

import org.springframework.http.HttpStatus;

public enum NotFoundErrorCode implements ErrorCode {

    NOT_FOUND_DESTINATION;

    private static final HttpStatus status = HttpStatus.NOT_FOUND;

    @Override
    public HttpStatus getStatus() {
        return status;
    }
}
