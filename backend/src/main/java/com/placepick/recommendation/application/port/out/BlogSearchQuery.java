package com.placepick.recommendation.application.port.out;

public record BlogSearchQuery(String query, int limit) {

    public BlogSearchQuery {
        query = SearchPortValues.requireQuery(query);
        if (limit < 1 || limit > 10) {
            throw new IllegalArgumentException("Blog search limit must be between 1 and 10.");
        }
    }
}
