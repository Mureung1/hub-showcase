package com.placepick.recommendation.reason.domain;

import java.util.Objects;

public record ReasonEvidence(
    String evidenceId,
    ReasonEvidenceType type,
    String title,
    String summary
) {

    public ReasonEvidence {
        evidenceId = requireEvidenceId(evidenceId);
        type = Objects.requireNonNull(type, "type");
        title = requireBoundedText(title, "title", 200);
        summary = requireBoundedText(summary, "summary", 500);
        if (title.isBlank() && summary.isBlank()) {
            throw new IllegalArgumentException("Reason evidence requires text.");
        }
    }

    private static String requireEvidenceId(String value) {
        Objects.requireNonNull(value, "evidenceId");
        if (!value.matches("[A-Za-z0-9._:-]{1,80}")) {
            throw new IllegalArgumentException("Reason evidence ID has an invalid format.");
        }
        return value;
    }

    private static String requireBoundedText(String value, String field, int maximum) {
        Objects.requireNonNull(value, field);
        int length = value.codePointCount(0, value.length());
        if (length > maximum || value.codePoints().anyMatch(Character::isISOControl)) {
            throw new IllegalArgumentException(field + " is outside the reason evidence contract.");
        }
        return value;
    }
}
