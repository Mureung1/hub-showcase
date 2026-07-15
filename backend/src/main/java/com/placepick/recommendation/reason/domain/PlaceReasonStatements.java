package com.placepick.recommendation.reason.domain;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

public record PlaceReasonStatements(UUID placeId, List<ReasonStatement> statements) {

    public PlaceReasonStatements {
        placeId = Objects.requireNonNull(placeId, "placeId");
        statements = List.copyOf(statements);
        if (statements.isEmpty() || statements.size() > 3) {
            throw new IllegalArgumentException("A place requires one to three reason statements.");
        }
    }
}
