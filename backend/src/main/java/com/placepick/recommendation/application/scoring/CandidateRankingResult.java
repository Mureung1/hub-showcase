package com.placepick.recommendation.application.scoring;

import com.placepick.recommendation.domain.scoring.EvidenceLevel;
import com.placepick.recommendation.domain.scoring.RankedPlace;
import com.placepick.recommendation.domain.scoring.RecommendationWarning;
import java.util.List;
import java.util.Objects;

public record CandidateRankingResult(
    List<RankedPlace> places,
    EvidenceLevel evidenceLevel,
    boolean degraded,
    List<RecommendationWarning> warnings,
    boolean relaxed,
    int placeSearchCalls,
    int blogSearchCalls
) {

    public CandidateRankingResult {
        places = List.copyOf(places);
        if (places.size() != 3) {
            throw new IllegalArgumentException("A successful ranking must contain exactly three places.");
        }
        evidenceLevel = Objects.requireNonNull(evidenceLevel, "evidenceLevel");
        warnings = List.copyOf(warnings);
        if (placeSearchCalls < 1 || placeSearchCalls > 2) {
            throw new IllegalArgumentException("Place search calls must be between one and two.");
        }
        if (blogSearchCalls < 0 || blogSearchCalls > 5) {
            throw new IllegalArgumentException("Blog search calls must be between zero and five.");
        }
    }
}
