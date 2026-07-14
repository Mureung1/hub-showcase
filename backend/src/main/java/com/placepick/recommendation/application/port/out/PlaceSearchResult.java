package com.placepick.recommendation.application.port.out;

import java.util.List;

public record PlaceSearchResult(int total, List<PlaceSearchItem> items) {

    public PlaceSearchResult {
        if (total < 0) {
            throw new IllegalArgumentException("Place search total must not be negative.");
        }
        items = List.copyOf(items);
    }
}
