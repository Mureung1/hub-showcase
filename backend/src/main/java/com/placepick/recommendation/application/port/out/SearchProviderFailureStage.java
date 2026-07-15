package com.placepick.recommendation.application.port.out;

/** Safe, provider-neutral stage used to diagnose a redacted search provider failure. */
public enum SearchProviderFailureStage {
    HTTP_STATUS,
    TRANSPORT,
    CLIENT,
    MEDIA_TYPE,
    RESPONSE_SIZE,
    JSON,
    ENVELOPE,
    ITEM,
    UNEXPECTED
}
