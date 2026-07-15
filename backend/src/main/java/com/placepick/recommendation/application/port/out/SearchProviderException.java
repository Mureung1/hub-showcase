package com.placepick.recommendation.application.port.out;

import java.io.Serial;
import java.util.Objects;

public final class SearchProviderException extends RuntimeException {

    @Serial
    private static final long serialVersionUID = 1L;

    private final SearchProviderFailure failure;
    private final Integer httpStatus;
    private final SearchProviderFailureStage stage;

    public SearchProviderException(
        SearchProviderFailure failure,
        Integer httpStatus,
        SearchProviderFailureStage stage,
        String message,
        Throwable cause
    ) {
        super(message, cause);
        this.failure = Objects.requireNonNull(failure, "failure");
        this.httpStatus = httpStatus;
        this.stage = Objects.requireNonNull(stage, "stage");
    }

    public SearchProviderFailure failure() {
        return failure;
    }

    public Integer httpStatus() {
        return httpStatus;
    }

    public SearchProviderFailureStage stage() {
        return stage;
    }
}
