package com.placepick.infrastructure.external.naver;

import java.net.URI;
import java.time.Duration;

/** Keeps the loopback-only constructor out of the production public API. */
public final class LinkedLiveNaverAdapterFactory {

    private LinkedLiveNaverAdapterFactory() {
    }

    public static NaverApiHubAdapter create(
        URI gatewayRoot,
        String localKeyId,
        String localKey
    ) {
        return NaverApiHubAdapter.createForTesting(
            gatewayRoot,
            localKeyId,
            localKey,
            Duration.ofSeconds(3),
            Duration.ofSeconds(30)
        );
    }
}
