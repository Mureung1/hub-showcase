package com.placepick.recommendation.application.port.out;

final class SearchPortValues {

    private SearchPortValues() {
    }

    static String requireQuery(String query) {
        if (query == null || query.isBlank()) {
            throw new IllegalArgumentException("Search query must not be blank.");
        }

        String normalized = query.strip();
        if (normalized.length() > 100) {
            throw new IllegalArgumentException("Search query must not exceed 100 characters.");
        }
        return normalized;
    }
}
