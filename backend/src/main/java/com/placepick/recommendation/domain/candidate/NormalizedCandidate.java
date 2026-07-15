package com.placepick.recommendation.domain.candidate;

import java.util.Objects;

public record NormalizedCandidate(
    CandidateKey candidateKey,
    String name,
    String category,
    String description,
    String address,
    String roadAddress,
    String sourceUrl,
    String searchableText
) {

    public NormalizedCandidate {
        candidateKey = Objects.requireNonNull(candidateKey, "candidateKey");
        name = requireNonBlank(name, "name");
        category = Objects.requireNonNull(category, "category");
        description = Objects.requireNonNull(description, "description");
        address = Objects.requireNonNull(address, "address");
        roadAddress = Objects.requireNonNull(roadAddress, "roadAddress");
        sourceUrl = SourceUrlPolicy.requireValid(sourceUrl);
        searchableText = Objects.requireNonNull(searchableText, "searchableText");
    }

    private static String requireNonBlank(String value, String field) {
        Objects.requireNonNull(value, field);
        if (value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank.");
        }
        return value;
    }
}
