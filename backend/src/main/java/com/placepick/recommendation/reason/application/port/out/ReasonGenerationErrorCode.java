package com.placepick.recommendation.reason.application.port.out;

public enum ReasonGenerationErrorCode {
    NONE,
    PROVIDER_INVALID_REQUEST,
    PROVIDER_AUTHENTICATION_FAILED,
    PROVIDER_RATE_LIMITED,
    PROVIDER_INVALID_RESPONSE,
    PROVIDER_UNAVAILABLE
}
