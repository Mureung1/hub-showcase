package com.placepick.infrastructure.external;

import java.net.URI;
import java.util.Locale;
import java.util.Set;

public final class ExternalApiEndpointPolicy {

    private static final Set<String> GUARDED_PROFILES = Set.of("local", "test", "load");
    private static final Set<String> SAFE_HOSTS = Set.of(
        "localhost",
        "127.0.0.1",
        "::1",
        "mock-naver",
        "mock-llm",
        "wiremock"
    );

    public void requireSafe(Set<String> activeProfiles, ExternalApiProperties properties) {
        if (activeProfiles.stream().noneMatch(GUARDED_PROFILES::contains)) {
            return;
        }

        if (!"mock".equals(properties.mode())) {
            throw new IllegalStateException(
                "Profiles local/test/load require PLACEPICK_EXTERNAL_MODE=mock."
            );
        }

        requireMockEndpoint("Naver", properties.naverBaseUrl());
        requireMockEndpoint("LLM", properties.llmBaseUrl());
    }

    private void requireMockEndpoint(String provider, URI endpoint) {
        String scheme = endpoint.getScheme();
        String host = endpoint.getHost();

        boolean safeScheme = scheme != null &&
            ("http".equals(scheme.toLowerCase(Locale.ROOT)) ||
             "https".equals(scheme.toLowerCase(Locale.ROOT)));
        boolean safeHost = host != null && SAFE_HOSTS.contains(host.toLowerCase(Locale.ROOT));
        boolean noCredentials = endpoint.getUserInfo() == null;

        if (!endpoint.isAbsolute() || !safeScheme || !safeHost || !noCredentials) {
            throw new IllegalStateException(
                provider + " base URL must target an approved local mock host for local/test/load profiles: " +
                endpoint
            );
        }
    }
}
