package com.placepick.recommendation.reason.adapter.out.llm;

import java.net.URI;

/** Keeps the loopback-only constructor out of the production public API. */
public final class LinkedLiveReasonClientFactory {

    private LinkedLiveReasonClientFactory() {
    }

    public static EliceGroundedReasonClient create(
        URI gatewayV1,
        String localBearer
    ) {
        return EliceGroundedReasonClient.createForTesting(
            gatewayV1,
            localBearer,
            EliceGroundedReasonClient.MODEL,
            EliceGroundedReasonClient.CONNECT_TIMEOUT,
            EliceGroundedReasonClient.RESPONSE_TIMEOUT,
            EliceGroundedReasonClient.MAX_RESPONSE_BYTES
        );
    }
}
