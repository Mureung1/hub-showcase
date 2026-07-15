package com.placepick.recommendation.reason.domain;

import java.util.HashSet;
import java.util.List;
import java.util.Objects;

public record ReasonStatement(String text, List<String> evidenceIds) {

    public ReasonStatement {
        Objects.requireNonNull(text, "text");
        int length = text.codePointCount(0, text.length());
        if (text.isBlank() || length > 120 ||
            text.codePoints().anyMatch(Character::isISOControl)) {
            throw new IllegalArgumentException("Reason statement must contain 1 to 120 safe characters.");
        }
        evidenceIds = List.copyOf(evidenceIds);
        if (evidenceIds.isEmpty() || evidenceIds.size() > 3 ||
            evidenceIds.stream().anyMatch(value ->
                value == null || !value.matches("[A-Za-z0-9._:-]{1,80}")) ||
            new HashSet<>(evidenceIds).size() != evidenceIds.size()) {
            throw new IllegalArgumentException("Reason statement evidence IDs are invalid.");
        }
    }
}
