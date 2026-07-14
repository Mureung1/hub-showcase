package com.placepick.recommendation.application.port.out;

import java.io.Serial;
import java.util.Objects;

public final class SearchProviderException extends RuntimeException {

    @Serial
    private static final long serialVersionUID = 1L;

    private final SearchProviderFailure failure;
    private final Integer httpStatus;

    public SearchProviderException(
        SearchProviderFailure failure,
        Integer httpStatus,
        String message,
        Throwable cause
    ) {
        super(message, cause);
        this.failure = Objects.requireNonNull(failure, "failure");
        this.httpStatus = httpStatus;
    }

    public SearchProviderFailure failure() {
        return failure;
    }

    public Integer httpStatus() {
        return httpStatus;
    }
}
