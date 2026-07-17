package com.chasewar.global.exception.errorcode;

import org.springframework.http.HttpStatus;

public enum InternalServerErrorCode implements ErrorCode {

    INTERNAL_SERVER_ERROR;

    private static final HttpStatus status = HttpStatus.INTERNAL_SERVER_ERROR;

    @Override
    public HttpStatus getStatus() {
        return status;
    }
}
