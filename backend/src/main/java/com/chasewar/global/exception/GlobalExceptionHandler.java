package com.chasewar.global.exception;

import com.chasewar.global.exception.errorcode.ErrorCode;
import com.chasewar.global.exception.errorcode.InternalServerErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ChasewarException.class)
    public ErrorResponse<FailureBody> handleChasewarException(ChasewarException e) {
        ErrorCode errorCode = e.getErrorCode();
        log.info("[CLIENT_ERROR] code={}, status={}", errorCode.name(), errorCode.getStatus());

        return ErrorResponse.from(errorCode);
    }

    @ExceptionHandler(Exception.class)
    public ErrorResponse<FailureBody> handleException(Exception e) {
        log.error("[SERVER_ERROR] {}", e.getMessage(), e);

        return ErrorResponse.from(InternalServerErrorCode.INTERNAL_SERVER_ERROR);
    }
}
