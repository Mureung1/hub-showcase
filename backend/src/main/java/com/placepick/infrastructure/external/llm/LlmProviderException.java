package com.placepick.infrastructure.external.llm;

import java.io.Serial;
import java.util.Objects;

/**
 * Redacted provider failure. The exception deliberately carries neither a request/response body,
 * an endpoint URL, nor the provider credential.
 */
public final class LlmProviderException extends RuntimeException {

    @Serial
    private static final long serialVersionUID = 1L;

    private final LlmProviderFailure failure;
    private final Integer httpStatus;
    private final LlmProviderFailureStage stage;

    LlmProviderException(
        LlmProviderFailure failure,
        Integer httpStatus,
        LlmProviderFailureStage stage,
        String message
    ) {
        super(message, null, false, false);
        this.failure = Objects.requireNonNull(failure, "failure");
        this.httpStatus = httpStatus;
        this.stage = Objects.requireNonNull(stage, "stage");
    }

    public LlmProviderFailure failure() {
        return failure;
    }

    public Integer httpStatus() {
        return httpStatus;
    }

    public LlmProviderFailureStage stage() {
        return stage;
    }
}
