package com.placepick.recommendation.reason.domain;

import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

public record ReasonPlaceContext(
    UUID placeId,
    String name,
    String category,
    List<ReasonEvidence> evidence
) {

    public ReasonPlaceContext {
        placeId = Objects.requireNonNull(placeId, "placeId");
        if (placeId.version() != 4) {
            throw new IllegalArgumentException("Reason placeId must be UUID v4.");
        }
        name = requireBounded(name, "name", false);
        category = requireBounded(category, "category", true);
        evidence = List.copyOf(evidence);
        if (evidence.isEmpty() || evidence.size() > 4) {
            throw new IllegalArgumentException("A reason place requires one to four evidence items.");
        }
        if (new HashSet<>(evidence.stream().map(ReasonEvidence::evidenceId).toList()).size() !=
            evidence.size()) {
            throw new IllegalArgumentException("Reason evidence IDs must be unique per place.");
        }
    }

    private static String requireBounded(String value, String field, boolean allowBlank) {
        Objects.requireNonNull(value, field);
        if ((!allowBlank && value.isBlank()) || value.codePointCount(0, value.length()) > 200 ||
            value.codePoints().anyMatch(Character::isISOControl)) {
            throw new IllegalArgumentException(field + " is outside the reason context contract.");
        }
        return value;
    }
}
