package com.placepick.infrastructure.external.llm;

import java.net.URI;

/** Keeps the loopback-only constructor out of the production public API. */
public final class LinkedLiveConditionClientFactory {

    private LinkedLiveConditionClientFactory() {
    }

    public static EliceConditionExtractionClient create(
        URI gatewayV1,
        String localBearer
    ) {
        return EliceConditionExtractionClient.createForTesting(
            gatewayV1,
            localBearer,
            EliceConditionExtractionClient.MODEL,
            EliceConditionExtractionClient.CONNECT_TIMEOUT,
            EliceConditionExtractionClient.RESPONSE_TIMEOUT,
            EliceConditionExtractionClient.MAX_RESPONSE_BYTES
        );
    }
}
