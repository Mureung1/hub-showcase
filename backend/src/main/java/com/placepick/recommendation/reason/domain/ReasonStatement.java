package com.placepick.recommendation.reason.domain;

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
        if (evidenceIds.size() != 1 || evidenceIds.get(0) == null ||
            !evidenceIds.get(0).matches("[A-Za-z0-9._:-]{1,80}")) {
            throw new IllegalArgumentException("Reason statement requires exactly one evidence ID.");
        }
    }
}
