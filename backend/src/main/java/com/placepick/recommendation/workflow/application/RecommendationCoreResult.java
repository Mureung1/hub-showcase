package com.placepick.recommendation.workflow.application;

import java.util.List;

public record RecommendationCoreResult(
    List<RecommendationCorePlace> places,
    boolean degraded,
    List<String> warnings,
    boolean reasonFallback,
    boolean relaxed,
    int placeSearchCalls,
    int blogSearchCalls,
    int reasonGenerationCalls
) {

    public RecommendationCoreResult {
        places = List.copyOf(places);
        warnings = List.copyOf(warnings);
        if (places.size() != 3) {
            throw new IllegalArgumentException("A successful core result requires exactly three places.");
        }
        if (placeSearchCalls < 1 || placeSearchCalls > 2 ||
            blogSearchCalls < 0 || blogSearchCalls > 5 ||
            reasonGenerationCalls != 1) {
            throw new IllegalArgumentException("Core provider call counts are outside the contract.");
        }
    }

    /** Excludes the condition extraction call, which is outside the confirmed-condition core. */
    public int providerCalls() {
        return placeSearchCalls + blogSearchCalls + reasonGenerationCalls;
    }
}
