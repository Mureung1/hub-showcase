package com.chasewar.global.exception;

import com.chasewar.global.exception.errorcode.BadRequestErrorCode;
import com.chasewar.global.exception.errorcode.ErrorCode;
import com.chasewar.global.exception.errorcode.InternalServerErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ChasewarException.class)
    public ErrorResponse<FailureBody> handleChasewarException(ChasewarException e) {
        ErrorCode errorCode = e.getErrorCode();
        if (errorCode.getStatus().is5xxServerError()) {
            log.error("[SERVER_ERROR] code={}, status={}",
                    errorCode.name(), errorCode.getStatus(), e);
        } else {
            log.info("[CLIENT_ERROR] code={}, status={}", errorCode.name(), errorCode.getStatus());
        }

        return ErrorResponse.from(errorCode);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ErrorResponse<FailureBody> handleMissingParameter(MissingServletRequestParameterException e) {
        ErrorCode errorCode = BadRequestErrorCode.MISSING_REQUEST_PARAMETER;
        log.info("[CLIENT_ERROR] code={}, status={}, parameter={}",
                errorCode.name(), errorCode.getStatus(), e.getParameterName());

        return ErrorResponse.from(errorCode);
    }

    @ExceptionHandler({BindException.class, MethodArgumentTypeMismatchException.class})
    public ErrorResponse<FailureBody> handleInvalidParameter(Exception e) {
        ErrorCode errorCode = BadRequestErrorCode.INVALID_REQUEST_PARAMETER;
        log.info("[CLIENT_ERROR] code={}, status={}, message={}",
                errorCode.name(), errorCode.getStatus(), e.getMessage());

        return ErrorResponse.from(errorCode);
    }

    @ExceptionHandler(Exception.class)
    public ErrorResponse<FailureBody> handleException(Exception e) {
        log.error("[SERVER_ERROR] {}", e.getMessage(), e);

        return ErrorResponse.from(InternalServerErrorCode.INTERNAL_SERVER_ERROR);
    }
}
