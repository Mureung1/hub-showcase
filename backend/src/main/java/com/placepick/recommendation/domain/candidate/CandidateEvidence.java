package com.placepick.recommendation.domain.candidate;

import java.util.Objects;

public record CandidateEvidence(
    String evidenceId,
    String title,
    String summary,
    String sourceUrl
) {

    public CandidateEvidence {
        evidenceId = requireNonBlank(evidenceId, "evidenceId");
        title = Objects.requireNonNull(title, "title");
        summary = Objects.requireNonNull(summary, "summary");
        sourceUrl = SourceUrlPolicy.requireValid(sourceUrl);
    }

    private static String requireNonBlank(String value, String field) {
        Objects.requireNonNull(value, field);
        if (value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank.");
        }
        return value;
    }
}
