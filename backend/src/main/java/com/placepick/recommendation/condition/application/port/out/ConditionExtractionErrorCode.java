package com.placepick.recommendation.condition.application.port.out;

public enum ConditionExtractionErrorCode {
    NONE,
    UNPROCESSABLE_CONDITION,
    PROVIDER_INVALID_REQUEST,
    PROVIDER_AUTHENTICATION_FAILED,
    PROVIDER_RATE_LIMITED,
    PROVIDER_INVALID_RESPONSE,
    PROVIDER_UNAVAILABLE
}
