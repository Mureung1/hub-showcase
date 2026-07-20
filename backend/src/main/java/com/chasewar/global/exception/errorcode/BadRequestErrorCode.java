package com.chasewar.global.exception.errorcode;

import org.springframework.http.HttpStatus;

public enum BadRequestErrorCode implements ErrorCode {

    MISSING_REQUEST_PARAMETER;

    private static final HttpStatus status = HttpStatus.BAD_REQUEST;

    @Override
    public HttpStatus getStatus() {
        return status;
    }
}
