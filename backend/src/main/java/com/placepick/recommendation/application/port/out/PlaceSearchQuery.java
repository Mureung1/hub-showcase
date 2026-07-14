package com.placepick.recommendation.application.port.out;

public record PlaceSearchQuery(String query, int limit) {

    public PlaceSearchQuery {
        query = SearchPortValues.requireQuery(query);
        if (limit < 1 || limit > 5) {
            throw new IllegalArgumentException("Place search limit must be between 1 and 5.");
        }
    }
}
