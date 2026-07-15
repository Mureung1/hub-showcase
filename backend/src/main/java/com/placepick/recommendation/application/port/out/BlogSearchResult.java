package com.placepick.recommendation.application.port.out;

import java.util.List;

public record BlogSearchResult(int total, List<BlogSearchItem> items) {

    public BlogSearchResult {
        if (total < 0) {
            throw new IllegalArgumentException("Blog search total must not be negative.");
        }
        items = List.copyOf(items);
    }
}
