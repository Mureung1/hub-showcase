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
            if (containsEncodedDotSegment(path)) {
                return Optional.empty();
            }
            URI origin = new URI(
                scheme,
                null,
                uri.getHost().toLowerCase(Locale.ROOT),
                port,
                null,
                null,
                null
            );
            String query = uri.getRawQuery() == null ? "" : "?" + uri.getRawQuery();
            URI canonical = new URI(origin.toASCIIString() + path + query).normalize();
            return Optional.of(canonical.toASCIIString());
        } catch (URISyntaxException | IllegalArgumentException exception) {
            return Optional.empty();
        }
    }

    private static boolean containsEncodedDotSegment(String path) {
        for (String segment : path.split("/", -1)) {
            String decodedDots = segment.replaceAll("(?i)%2e", ".");
            if (decodedDots.equals(".") || decodedDots.equals("..")) {
                return true;
            }
        }
        return false;
    }
}
