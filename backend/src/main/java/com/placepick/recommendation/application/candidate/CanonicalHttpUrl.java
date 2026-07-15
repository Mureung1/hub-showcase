package com.placepick.recommendation.application.candidate;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;
import java.util.Optional;

final class CanonicalHttpUrl {

    private CanonicalHttpUrl() {
    }

    static Optional<String> from(String raw) {
        if (raw == null || raw.isBlank()) {
            return Optional.empty();
        }
        try {
            URI uri = new URI(raw.trim());
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
            if (!(scheme.equals("http") || scheme.equals("https"))
                || uri.getHost() == null
                || uri.getHost().isBlank()
                || uri.getUserInfo() != null) {
                return Optional.empty();
            }
            int port = uri.getPort();
            if ((scheme.equals("http") && port == 80) || (scheme.equals("https") && port == 443)) {
                port = -1;
            }
            String path = uri.getRawPath();
            if (path == null || path.isBlank()) {
                path = "/";
            }
            URI canonical = new URI(
                scheme,
                null,
                uri.getHost().toLowerCase(Locale.ROOT),
                port,
                path,
                uri.getRawQuery(),
                null
            ).normalize();
            return Optional.of(canonical.toASCIIString());
        } catch (URISyntaxException | IllegalArgumentException exception) {
            return Optional.empty();
        }
    }
}
