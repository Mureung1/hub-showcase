package com.chasewar.global.exception.errorcode;

import org.springframework.http.HttpStatus;

public enum InternalServerErrorCode implements ErrorCode {

    INTERNAL_SERVER_ERROR,
    INVALID_COORDINATES,
    MISSING_PARKING_LOT_CODE,
    INVALID_FEE;

    private static final HttpStatus status = HttpStatus.INTERNAL_SERVER_ERROR;

    @Override
    public HttpStatus getStatus() {
        return status;
    }
}
