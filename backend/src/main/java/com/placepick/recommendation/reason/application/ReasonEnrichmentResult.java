package com.placepick.recommendation.reason.application;

import java.util.List;

public record ReasonEnrichmentResult(
    List<EnrichedPlaceReason> places,
    boolean fallbackUsed
) {

    public ReasonEnrichmentResult {
        places = List.copyOf(places);
        if (places.size() != 3) {
            throw new IllegalArgumentException("Reason enrichment requires exactly three places.");
        }
    }
}
