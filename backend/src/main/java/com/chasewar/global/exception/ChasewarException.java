package com.chasewar.global.exception;

import com.chasewar.global.exception.errorcode.ErrorCode;
import lombok.Getter;

@Getter
public class ChasewarException extends RuntimeException {

    private final ErrorCode errorCode;

    public ChasewarException(ErrorCode errorCode) {
        super(errorCode.name());
        this.errorCode = errorCode;
    }
}