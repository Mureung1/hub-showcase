package com.placepick.infrastructure.external.llm;

/** Stable failure categories exposed by the LLM transport boundary. */
public enum LlmProviderFailure {
    INVALID_REQUEST,
    AUTHENTICATION_FAILED,
    RATE_LIMITED,
    INVALID_RESPONSE,
    PROVIDER_UNAVAILABLE
}
