package com.placepick.recommendation.application.port.out;

public enum SearchProviderFailure {
    INVALID_REQUEST,
    AUTHENTICATION_FAILED,
    RATE_LIMITED,
    INVALID_RESPONSE,
    PROVIDER_UNAVAILABLE
}
