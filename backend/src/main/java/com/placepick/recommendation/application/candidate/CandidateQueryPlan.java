package com.placepick.recommendation.application.candidate;

import java.util.List;

public record CandidateQueryPlan(String query, List<IncludedPreference> includedPreferences) {

    public CandidateQueryPlan {
        if (query == null || query.isBlank() ||
            query.codePointCount(0, query.length()) > 100) {
            throw new IllegalArgumentException("Candidate query must contain between 1 and 100 characters.");
        }
        includedPreferences = List.copyOf(includedPreferences);
    }
}
